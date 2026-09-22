import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'relativeTime',
    standalone: true,
})
export class RelativeTimePipe implements PipeTransform {
    transform(value: string | Date | number): string {
        if (!value) return '';

        const time = new Date(value).getTime();
        const now = Date.now();
        const diff = now - time;

        // Handle future dates or exact match as "Just now"
        if (diff < 10000) return 'Just now';

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (years > 0) return years === 1 ? '1 year ago' : `${years} years ago`;
        if (months > 0) return months === 1 ? '1 month ago' : `${months} months ago`;
        if (days > 1) return `${days} days ago`;
        if (days === 1) return 'Yesterday';
        if (hours > 0) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        if (minutes > 0) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;

        return 'Just now';
    }
}
