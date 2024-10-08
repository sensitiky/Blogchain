import { IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  authorId: number;

  @IsNotEmpty()
  postId: number;

  @IsOptional()
  @IsNumber()
  parentCommentId?: number;
}
