import { Module } from '@nestjs/common';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';
import { CollabModule } from '../collab/collab.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
    imports: [CollabModule, CloudinaryModule],
    controllers: [DocsController],
    providers: [DocsService],
})
export class DocsModule {}
