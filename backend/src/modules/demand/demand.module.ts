import { Module } from '@nestjs/common';
import { DemandController } from './demand.controller';
import { DemandService } from './demand.service';
import { ProductsModule } from '../products/products.module';
import { FirebaseModule } from '../../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ProductsModule, FirebaseModule, UsersModule],
  controllers: [DemandController],
  providers: [DemandService],
  exports: [DemandService],
})
export class DemandModule {}
