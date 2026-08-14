import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    UseInterceptors,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ClassConstructor {
    new (...args: any[]): object;
}

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
    constructor(private readonly dto: ClassConstructor) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data: unknown) => {
                // Type guard / assertion to safely check for ApiResponse wrapper structure
                if (data && typeof data === 'object' && 'data' in data) {
                    const response = data as Record<string, any>;
                    response.data = plainToInstance(this.dto, response.data, {
                        excludeExtraneousValues: true,
                    });
                    return response;
                }

                return plainToInstance(this.dto, data, {
                    excludeExtraneousValues: true,
                });
            }),
        );
    }
}

export function Serialize(dto: ClassConstructor) {
    return UseInterceptors(new SerializeInterceptor(dto));
}
