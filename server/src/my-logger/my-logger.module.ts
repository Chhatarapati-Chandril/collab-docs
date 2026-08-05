import { Global, Module } from '@nestjs/common';
import { MyLoggerService } from './my-logger.service';

@Global()
@Module({
    providers: [MyLoggerService],
    exports: [MyLoggerService], // Export so other modules can inject it
})
export class MyLoggerModule {}
