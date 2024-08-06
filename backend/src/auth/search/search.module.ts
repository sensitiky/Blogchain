import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { User } from '../users/user.entity';
import { Post } from '../posts/post.entity';
import { PostsModule } from '../posts/posts.module';
import { UsersModule } from '../users/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Post]), PostsModule, UsersModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
