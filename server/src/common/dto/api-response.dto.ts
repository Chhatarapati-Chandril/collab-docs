interface ApiResponseOptions<T> {
    statusCode: number;
    message?: string;
    data?: T;
}

export class ApiResponse<T> {
    readonly success: boolean;
    readonly statusCode: number;
    readonly message: string;
    readonly data?: T;

    constructor({ statusCode, message = 'Success', data }: ApiResponseOptions<T>) {
        this.success = statusCode >= 200 && statusCode < 300;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
}
