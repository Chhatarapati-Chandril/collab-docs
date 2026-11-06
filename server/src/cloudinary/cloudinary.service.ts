import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';
import 'multer';

export interface CloudinaryUploadResult {
    url: string;
    secureUrl: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
}

@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name);
    private isConfigured = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
        const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
        const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

        if (cloudName && apiKey && apiSecret) {
            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
                secure: true,
            });
            this.isConfigured = true;
            this.logger.log(`Cloudinary configured successfully for cloud: ${cloudName}`);
        } else {
            this.logger.warn('Cloudinary credentials missing from configuration.');
        }
    }

    /**
     * Upload an image buffer to Cloudinary under folder `collabdocs/covers/`
     * Enforces 16:9 responsive optimizations, max 5MB, and allowed image MIME types.
     */
    async uploadCover(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
        if (!this.isConfigured) {
            throw new BadRequestException('Cloudinary service is not configured');
        }

        if (!file || !file.buffer) {
            throw new BadRequestException('No image file provided');
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Unsupported image format (${file.mimetype}). Supported formats: JPEG, PNG, WebP.`,
            );
        }

        const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
        if (file.size > maxSizeBytes) {
            throw new BadRequestException('Image exceeds the maximum upload limit of 5 MB');
        }

        return new Promise<CloudinaryUploadResult>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'collabdocs/covers',
                    resource_type: 'image',
                    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                    transformation: [
                        { width: 1600, height: 900, crop: 'limit' },
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                },
                (error, result: UploadApiResponse | undefined) => {
                    if (error || !result) {
                        this.logger.error('Failed to upload image to Cloudinary', error);
                        return reject(
                            new BadRequestException('Failed to upload image to Cloudinary'),
                        );
                    }

                    resolve({
                        url: result.url,
                        secureUrl: result.secure_url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                    });
                },
            );

            uploadStream.end(file.buffer);
        });
    }

    /**
     * Safely delete an asset from Cloudinary.
     * Prevents deleting assets that are still referenced by other documents.
     */
    async deleteCover(publicId: string): Promise<boolean> {
        if (!this.isConfigured || !publicId || !publicId.startsWith('collabdocs/covers/')) {
            return false;
        }

        try {
            // Check if other documents are referencing this same publicId
            const usageCount = await this.prisma.document.count({
                where: { coverPublicId: publicId },
            });

            // If referenced by more than 1 document, do NOT delete from Cloudinary
            if (usageCount > 1) {
                this.logger.log(
                    `Asset ${publicId} is shared by ${usageCount} documents. Retaining asset.`,
                );
                return false;
            }

            const response = (await cloudinary.uploader.destroy(publicId, {
                resource_type: 'image',
            })) as { result?: string };
            const resultStatus = response?.result ?? 'unknown';
            this.logger.log(`Cloudinary asset destroyed: ${publicId} (result: ${resultStatus})`);
            return resultStatus === 'ok';
        } catch (error) {
            this.logger.error(`Failed to delete Cloudinary asset ${publicId}`, error);
            return false;
        }
    }

    /**
     * Generate an optimized responsive delivery URL for thumbnails
     */
    getOptimizedThumbnailUrl(publicId: string, width = 800, height = 450): string {
        if (!this.isConfigured || !publicId) {
            return '';
        }

        return cloudinary.url(publicId, {
            secure: true,
            transformation: [
                { width, height, crop: 'fill', gravity: 'auto' },
                { quality: 'auto', fetch_format: 'auto' },
            ],
        });
    }
}
