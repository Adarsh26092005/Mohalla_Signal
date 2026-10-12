import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductMatcherService } from './product-matcher.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductMatcherService],
  exports: [ProductsService, ProductMatcherService],
})
export class ProductsModule {}
