import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { Document } from '../../core/models/doc.model';
import { RelativeTimePipe } from '../pipes/relative-time.pipe';
import { DatePipe } from '@angular/common';
import { getColorForUser, getInitial, getColorForId } from '../utils/avatar.util';

@Component({
    selector: 'app-doc-card',
    standalone: true,
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatChipsModule,
        RelativeTimePipe,
        DatePipe,
    ],
    templateUrl: './doc-card.html',
    styleUrl: './doc-card.scss',
})
export class DocCard {
    @Input({ required: true }) document!: Document;
    @Input() isOwner = false;
    @Input() viewMode: 'grid' | 'list' = 'grid';

    @Output() open = new EventEmitter<string>();
    @Output() rename = new EventEmitter<Document>();
    @Output() share = new EventEmitter<Document>();
    @Output() copyDoc = new EventEmitter<string>();
    @Output() delete = new EventEmitter<string>();

    readonly getColorForUser = getColorForUser;
    readonly getColorForId = getColorForId;
    readonly getInitial = getInitial;

    get hasValidTitle(): boolean {
        const title = this.document?.title;
        return !!title && title.trim() !== '' && title.trim().toLowerCase() !== 'untitled document';
    }

    get watermarkChar(): string {
        return this.hasValidTitle ? this.document.title.trim().charAt(0).toUpperCase() : '';
    }
}
