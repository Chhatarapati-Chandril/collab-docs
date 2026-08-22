import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { DocsService } from './docs.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { GetDocumentsResponseDto } from './dto/get-documents-response.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { Serialize } from '../common/intercepters/serialize.interceptor';

@UseGuards(JwtAuthGuard)
@Controller('docs')
export class DocsController {
    constructor(private readonly docsService: DocsService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Serialize(DocumentResponseDto)
    async create(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CreateDocumentDto,
    ): Promise<ApiResponse<DocumentResponseDto>> {
        const document = await this.docsService.createDocument(user.userId, dto);

        return new ApiResponse({
            statusCode: HttpStatus.CREATED,
            message: 'Document created successfully',
            data: document,
        });
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @Serialize(GetDocumentsResponseDto)
    async findAll(
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<ApiResponse<GetDocumentsResponseDto>> {
        const documents = await this.docsService.getDocuments(user.userId);

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Documents fetched successfully',
            data: documents,
        });
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @Serialize(DocumentResponseDto)
    async update(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') id: string,
        @Body() dto: UpdateDocumentDto,
    ): Promise<ApiResponse<DocumentResponseDto>> {
        const document = await this.docsService.updateDocument(user.userId, id, dto);

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Document updated successfully',
            data: document,
        });
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async remove(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') id: string,
    ): Promise<ApiResponse<null>> {
        await this.docsService.deleteDocument(user.userId, id);

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Document deleted successfully',
            data: null,
        });
    }

    @Post(':id/copy')
    @HttpCode(HttpStatus.CREATED)
    @Serialize(DocumentResponseDto)
    async copy(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') id: string,
    ): Promise<ApiResponse<DocumentResponseDto>> {
        const document = await this.docsService.copyDocument(user.userId, id);

        return new ApiResponse({
            statusCode: HttpStatus.CREATED,
            message: 'Document copied successfully',
            data: document,
        });
    }
}
