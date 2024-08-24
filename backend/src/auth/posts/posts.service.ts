import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Post } from './post.entity';
import { CreatePostDto } from './posts.dto';
import { User } from '../users/user.entity';
import { Tag } from '../tag/tag.entity';
import { Category } from '../category/category.entity';
import { Favorite } from '../favorites/favorite.entity';
import { Comment } from '../comments/comment.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
  ) {}

  async findUserFavorites(userId: number): Promise<Post[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['favorites', 'favorites.post'],
    });
    if (!user) {
      throw new Error('User not found');
    }

    const favoritePostIds = user.favorites
      .filter((favorite) => favorite.post)
      .map((favorite) => favorite.post.id);

    const favoritePosts = await this.postsRepository.findByIds(favoritePostIds);

    return favoritePosts;
  }

  async getArticlesByCategory() {
    return this.postsRepository
      .createQueryBuilder('post')
      .leftJoin('post.category', 'category')
      .select('post.categoryId')
      .addSelect('category.name')
      .addSelect('COUNT(post.id)', 'count')
      .groupBy('post.categoryId')
      .addGroupBy('category.name')
      .getRawMany();
  }

  async getAverageReadTime() {
    return this.postsRepository
      .createQueryBuilder('post')
      .select('AVG(post.readTime)', 'average')
      .getRawOne();
  }

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const author = await this.usersRepository.findOne({
      where: { id: createPostDto.authorId },
    });

    if (!author) {
      throw new Error('Author not found');
    }

    const category = createPostDto.categoryId
      ? await this.categoriesRepository.findOne({
          where: { id: createPostDto.categoryId },
        })
      : null;

    let tags = [];
    if (typeof createPostDto.tags === 'string') {
      tags = JSON.parse(createPostDto.tags);
    }

    tags = Array.isArray(tags)
      ? await Promise.all(
          tags.map(async (tag) => {
            let existingTag = await this.tagsRepository.findOne({
              where: { name: tag.name },
            });
            if (!existingTag) {
              existingTag = this.tagsRepository.create({ name: tag.name });
              await this.tagsRepository.save(existingTag);
            }
            return existingTag;
          }),
        )
      : [];

    const post = this.postsRepository.create({
      ...createPostDto,
      author,
      category,
      tags,
    });

    await this.postsRepository.save(post);
    author.postCount += 1;
    await this.usersRepository.save(author);

    return post;
  }

  async deletePost(postId: number): Promise<void> {
    const post = await this.postsRepository.findOne({
      where: { id: postId },
      relations: ['author', 'comments', 'favorites'],
    });

    if (post) {
      if (post.comments && post.comments.length > 0) {
        for (const comment of post.comments) {
          const favoritesForComment = await this.favoritesRepository.find({
            where: { comment },
          });
          if (favoritesForComment.length > 0) {
            await this.favoritesRepository.remove(favoritesForComment);
          }
        }
        await this.commentsRepository.remove(
          post.comments as unknown as Comment[],
        );
      }

      if (post.favorites && post.favorites.length > 0) {
        await this.favoritesRepository.remove(
          post.favorites as unknown as Favorite[],
        );
      }

      const author = post.author;
      await this.postsRepository.remove(post);

      if (author) {
        author.postCount -= 1;
        await this.usersRepository.save(author);
      }
    }
  }
  private transformMediaToBase64(posts: Post[]): Post[] {
    return posts.map((post) => {
      if (post.imageUrl) {
        const isGif = post.imageUrl.includes('.gif');
        const mimeType = isGif ? 'image/gif' : 'image/jpeg';
        const base64Image = `data:${mimeType};base64,${post.imageUrl.toString('base64')}`;
        return {
          ...post,
          imageUrl: undefined,
          imageUrlBase64: base64Image,
        };
      }
      return post;
    });
  }

  async findAll(page: number, limit: number, order: string) {
    let queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.tags', 'tags');

    switch (order) {
      case 'saved':
        queryBuilder = this.postsRepository
          .createQueryBuilder('post')
          .leftJoinAndSelect('post.author', 'author')
          .leftJoinAndSelect('post.category', 'category')
          .leftJoinAndSelect('post.tags', 'tags')
          .leftJoin('post.favorites', 'favorites')
          .addSelect('COUNT(DISTINCT favorites.id)', 'favoritesCount')
          .groupBy('post.id')
          .addGroupBy('author.id')
          .addGroupBy('category.id')
          .addGroupBy('tags.id')
          .orderBy('favoritesCount', 'DESC');
        break;
      case 'comment':
        queryBuilder = this.postsRepository
          .createQueryBuilder('post')
          .leftJoinAndSelect('post.author', 'author')
          .leftJoinAndSelect('post.category', 'category')
          .leftJoinAndSelect('post.tags', 'tags')
          .leftJoin('post.comments', 'comments')
          .addSelect('COUNT(DISTINCT comments.id)', 'commentsCount')
          .groupBy('post.id')
          .addGroupBy('author.id')
          .addGroupBy('category.id')
          .addGroupBy('tags.id')
          .orderBy('commentsCount', 'DESC');
        break;
      case 'recent':
      default:
        queryBuilder.orderBy('post.createdAt', 'DESC');
        break;
    }

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [result, total] = await queryBuilder.getManyAndCount();

    const transformMediaToBase64 = (posts: Post[]) => {
      return posts.map((post) => {
        if (post.imageUrl) {
          const isGif = post.imageUrl.includes('.gif');
          const mimeType = isGif ? 'image/gif' : 'image/jpeg';
          const base64Image = `data:${mimeType};base64,${post.imageUrl.toString('base64')}`;
          return {
            ...post,
            imageUrl: undefined,
            imageUrlBase64: base64Image,
          };
        }
        return post;
      });
    };

    const transformedResult = transformMediaToBase64(result);

    return {
      data: transformedResult,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByTag(
    limit: number,
    tagId: number,
    categoryId: number,
  ): Promise<Post[]> {
    const posts = await this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.tags', 'tag')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.author', 'author')
      .where('tag.id = :tagId', { tagId })
      .andWhere('category.id = :categoryId', { categoryId })
      .take(limit)
      .getMany();

    return this.transformMediaToBase64(posts);
  }

  async findAllByCategory(page: number, limit: number, categoryId: number) {
    const [result, total] = await this.postsRepository.findAndCount({
      where: { category: { id: categoryId } },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author', 'category', 'tags', 'comments', 'favorites'],
    });

    const transformedResult = this.transformMediaToBase64(result);

    return {
      data: transformedResult,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: [
        'author',
        'category',
        'tags',
        'comments',
        'comments.author',
        'favorites',
      ],
    });

    if (post && post.imageUrl) {
      const isGif = post.imageUrl.includes('.gif');
      const mimeType = isGif ? 'image/gif' : 'image/jpeg';
      post.imageUrlBase64 = `data:${mimeType};base64,${post.imageUrl.toString('base64')}`;
    }

    return post;
  }

  async searchPosts(query: string): Promise<Post[]> {
    return this.postsRepository.find({
      where: { title: Like(`%${query}%`) },
    });
  }

  async findPostsByUserId(userId: number): Promise<Post[]> {
    return this.postsRepository.find({
      where: { author: { id: userId } },
      relations: ['author', 'category', 'tags', 'comments', 'favorites'],
    });
  }

  async countPostsByCategory() {
    return this.postsRepository
      .createQueryBuilder('post')
      .select('post.categoryId')
      .addSelect('COUNT(post.id)', 'count')
      .groupBy('post.categoryId')
      .getRawMany();
  }

  async countPostsByTag(categoryId: number) {
    return this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.tags', 'tag')
      .select('tag.id', 'tagId')
      .addSelect('tag.name', 'name')
      .addSelect('COUNT(post.id)', 'count')
      .where('post.categoryId = :categoryId', { categoryId })
      .groupBy('tag.id')
      .addGroupBy('tag.name')
      .getRawMany();
  }

  async updatePost(
    postId: number,
    updatePostDto: CreatePostDto,
  ): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id: postId },
      relations: ['author', 'category', 'tags'],
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (updatePostDto.authorId) {
      const author = await this.usersRepository.findOne({
        where: { id: updatePostDto.authorId },
      });
      if (!author) {
        throw new Error('Author not found');
      }
      post.author = author;
    }

    if (updatePostDto.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: { id: updatePostDto.categoryId },
      });
      post.category = category;
    }

    if (updatePostDto.tags) {
      let tags = [];
      if (typeof updatePostDto.tags === 'string') {
        tags = JSON.parse(updatePostDto.tags);
      }

      tags = Array.isArray(tags)
        ? await Promise.all(
            tags.map(async (tag) => {
              let existingTag = await this.tagsRepository.findOne({
                where: { name: tag.name },
              });
              if (!existingTag) {
                existingTag = this.tagsRepository.create({ name: tag.name });
                await this.tagsRepository.save(existingTag);
              }
              return existingTag;
            }),
          )
        : [];

      post.tags = tags;
    }

    post.title = updatePostDto.title;
    post.content = updatePostDto.content;
    post.description = updatePostDto.description;

    if (updatePostDto.imageUrl) {
      post.imageUrl = updatePostDto.imageUrl;
    }

    return await this.postsRepository.save(post);
  }
}
