'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import Header from '@/assets/header';
import Footer from '@/assets/footer';
import Link from 'next/link';
import { ClockIcon, TagIcon } from 'lucide-react';
import DOMPurify from 'dompurify';
import Image from 'next/image';
import { useAuth } from '../../../context/authContext';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Post, Category, Tag } from '@/interfaces/interface3';
import LoginCard from '@/assets/login';

const POSTS_PER_PAGE = 20;

const Articles = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showLoginCard, setShowLoginCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL_DEV;
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<string>('recent');
  const [sortOrder2, setSortOrder2] = useState<string>('All');
  const { token } = useAuth();
  const [categoryCounts, setCategoryCounts] = useState<
    { categoryId: number; count: number }[]
  >([]);
  const [tags, setTags] = useState<
    { id: number; name: string; count: number }[]
  >([]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories', error);
    }
  }, [API_URL, token]);

  const fetchPosts = useCallback(
    async (
      page: number,
      order: string,
      categoryId: number | null = null,
      tagId: number | null = null
    ) => {
      setLoading(true);
      try {
        let url = `${API_URL}/posts?page=${page}&limit=${POSTS_PER_PAGE}&order=${order}&descriptionLength=${sortOrder2}`;

        if (categoryId && tagId) {
          url = `${API_URL}/posts/by-tag?tagId=${tagId}&categoryId=${categoryId}&order=${order}&descriptionLength=${sortOrder2}`;
        } else if (categoryId) {
          url = `${API_URL}/posts/by-category?categoryId=${categoryId}&page=${page}&limit=${POSTS_PER_PAGE}&order=${order}&descriptionLength=${sortOrder2}`;
        } else if (tagId) {
          url = `${API_URL}/posts/by-tag?tagId=${tagId}&page=${page}&limit=${POSTS_PER_PAGE}&order=${order}&descriptionLength=${sortOrder2}`;
        }

        const response = await axios.get(url);
        const postsData = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];

        setPosts((prevPosts) =>
          page === 1 ? postsData : [...prevPosts, ...postsData]
        );
        setHasMore(postsData.length > 0);
        setCurrentPage(page);
      } catch (error) {
        console.error('Error fetching posts', error);
      } finally {
        setLoading(false);
      }
    },
    [API_URL, sortOrder2]
  );

  const fetchCategoryCounts = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/posts/count-by-category`);
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = response.data;
      setCategoryCounts(result);
    } catch (error) {
      console.error('Error fetching category counts:', error);
    }
  }, []);

  const fetchTags = useCallback(async (categoryId: number) => {
    try {
      const response = await axios.get(
        `${API_URL}/posts/count-by-tag?categoryId=${categoryId}`
      );

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tags = response.data.map((tag: any) => ({
        id: tag.tagId, 
        name: tag.name, 
        count: tag.count,
      }));

      setTags(tags);
    } catch (error: any) {
      console.error('Error fetching tags:', error.message || error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchCategoryCounts();
    fetchPosts(1, sortOrder, selectedCategoryId, selectedTagId);
  }, [
    fetchCategories,
    fetchCategoryCounts,
    fetchPosts,
    sortOrder,
    selectedCategoryId,
    selectedTagId,
  ]);

  const handleCategoryChange = useCallback(
    (categoryId: number | null) => {
      const newCategoryId =
        selectedCategoryId === categoryId ? null : categoryId;
      setSelectedCategoryId(newCategoryId);
      setSelectedTagId(null); 
      setSortOrder('recent'); 
      setPosts([]);
      fetchPosts(1, 'recent', newCategoryId);
      if (newCategoryId !== null) {
        fetchTags(newCategoryId);
      } else {
        setTags([]);
      }
    },
    [fetchPosts, fetchTags, selectedCategoryId]
  );
  const handleCloseModal = () => {
    setShowLoginCard(false);
  };
  const handleTagChange = useCallback(
    (id: number | null) => {
      const newTagId = selectedTagId === id ? null : id;
      setSelectedTagId(newTagId);
      setPosts([]);
      fetchPosts(1, sortOrder, selectedCategoryId, newTagId);
    },
    [fetchPosts, selectedCategoryId, sortOrder, selectedTagId]
  );

  const renderTags = () => {
    return tags.map((tag) => (
      <Button
        key={tag.id}
        className={`text-white rounded-full border border-white text-base font-normal ${
          selectedTagId === tag.id
            ? 'bg-[#FFC017] text-[#0d0d0d] hover:bg-[#FFC017]'
            : ''
        }`}
        onClick={() => handleTagChange(tag.id)}
      >
        {tag.name} ({tag.count})
      </Button>
    ));
  };

  const handleSortOrderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSortOrder = e.target.value;
      setSortOrder(newSortOrder);
      setPosts([]);
      fetchPosts(1, newSortOrder, selectedCategoryId, selectedTagId);
    },
    [fetchPosts, selectedCategoryId, selectedTagId]
  );

  const handleSortOrder2Change = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSortOrder2 = e.target.value;
      setSortOrder2(newSortOrder2);
      setPosts([]);  
      fetchPosts(1, sortOrder, selectedCategoryId, selectedTagId);
    },
    [fetchPosts, sortOrder, selectedCategoryId, selectedTagId]
  );

  const formatTags = (tags: any[]): string => {
    return (
      tags
        .map((tag) => {
          try {
            const parsedName = JSON.parse(tag.name);
            return parsedName.name;
          } catch (err) {
            return tag.name;
          }
        })
        .join(', ') || 'No tags'
    );
  };

  const formatTagsButton = (tags: any[]): string => {
    return (
      tags
        .map((tag) => {
          try {
            const parsedName = JSON.parse(tag.name);
            return parsedName.name;
          } catch (err) {
            return tag.name;
          }
        })
        .join(', ') || 'No tags'
    );
  };

  const calculateReadingTime = useCallback((text: string) => {
    const wordsPerMinute = 200;
    const cleanText = text.replace(/<[^>]*>/g, '');
    const numberOfWords = cleanText.split(/\s+/).length;
    return Math.ceil(numberOfWords / wordsPerMinute);
  }, []);

  const renderPosts = useMemo(() => {
    if (posts.length === 0 && !loading) {
      return (
        <div className="relative flex flex-col items-center justify-center bg-[#fefefe]">
          <Image
            src="/BLOGCHAIN.gif"
            width={200}
            height={200}
            alt="Blogchain Logo"
            className="animate-bounce rounded-full"
          />
        </div>
      );
    }

    return posts.map((post) => (
      <div
        key={post.id}
        className="w-full p-3 sm:p-4 md:p-6 mx-auto text-card-foreground border-b-2 transition-transform ios-style"
      >
        <div className="flex flex-col">
          {post.imageUrlBase64 && (
            <div className="w-full h-48 sm:h-64 md:h-80 relative">
              <Image
                src={post.imageUrlBase64}
                alt="Post Image"
                layout="fill"
                objectFit="cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex flex-col justify-between items-start mt-2">
            <div className="flex items-center mb-2 w-full">
              <Link href={`/users/${post.author?.id}`} target="_blank">
                <Image
                  src={
                    post.author?.avatar
                      ? post.author.avatar.startsWith('http')
                        ? post.author.avatar
                        : `${API_URL}${post.author.avatar}`
                      : '/default-avatar.webp'
                  }
                  alt="Author image"
                  width={1920}
                  height={1080}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                />
              </Link>
              <div className="flex flex-col ml-2 flex-grow">
                <span className="text-base text-[1.2rem] font-semibold text-[#263238] truncate">
                  {post.author ? post.author.user : 'Unknown Author'}
                </span>
                <span className="text-xs text-[1.1rem] text-muted-foreground truncate">
                  {post.author ? post.author.role : 'Unknown Author'}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="flex items-center text-[#263238] text-[1rem] sm:text-base truncate">
                  <Image
                    src="/category.png"
                    className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
                    alt="Category"
                    width={1920}
                    height={1080}
                  />{' '}
                  {post.category?.name}
                </span>
                <div className="flex items-center text-[#263238] text-[0.95rem] sm:text-sm truncate mt-1">
                  <TagIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  {formatTags(Array.isArray(post.tags) ? post.tags : [])}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 mt-4">
            <Link href={`/posts/${post.id}`}>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 truncate text-[#263238]">
                {post.title}
              </h2>
            </Link>
            <p
              className="text-sm sm:text-base text-muted-foreground mb-4 line-clamp-3 break-words"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(post.description, {
                  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
                  ALLOWED_ATTR: ['href'],
                }),
              }}
            ></p>
          </div>
          <div className="flex flex-wrap items-center text-muted-foreground mt-4 gap-2">
            <div className="flex items-center">
              <ClockIcon className="w-4 h-4 mr-1" />
              <span className="text-sm">
                {calculateReadingTime(post.description)} min read
              </span>
            </div>
            <div className="flex items-center">
              <Image
                src="/comment.png"
                alt="Comment"
                width={1920}
                height={1080}
                className="w-4 h-4 mr-1"
              />
              <span className="text-sm">{post.commentscount || 0}</span>
            </div>
            <div className="flex items-center">
              <Image
                src="/saved-svgrepo-com.png"
                alt="Saved"
                width={1920}
                height={1080}
                className="w-4 h-4 mr-1"
              />
              <span className="text-sm">{post.favoritescount || 0}</span>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Link href={`/posts/${post.id}`} aria-label="Articles redirection">
              <button className="bg-[#000916] text-white px-3 py-1 sm:px-4 sm:py-2 text-base font-normal sm:text-base rounded-full hover:bg-[#000916]/80">
                Read More
              </button>
              <span className="sr-only">Read more about {post.title}</span>
            </Link>
          </div>
        </div>
      </div>
    ));
  }, [posts, loading, API_URL, calculateReadingTime]);

  return (
    <div className="articles-container flex flex-col min-h-screen w-screen z-auto">
      <Header />
      <main className="flex-grow">
        <div className="articles-header bg-[#000916] text-center py-4 sm:py-8 px-2 sm:px-4">
          <div className="articles-title-container py-6 sm:py-12">
            <h1 className="articles-title text-[2.6rem] font-bold text-yellow-500">
              Articles
            </h1>
          </div>
          <div className="text-center py-2 sm:py-4 w-full">
            <h3 className="text-[1.6rem] font-normal text-white mb-3 sm:mb-6">
              Categories
            </h3>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4">
              {categories.length > 0 ? (
                categories.map((category) => {
                  const categoryCount =
                    categoryCounts.find(
                      (item) => item.categoryId === category.id
                    )?.count || 0;
                  return (
                    <Button
                      key={category.id}
                      className={`text-white rounded-full border border-white text-base text-[1.1rem] font-normal ${
                        selectedCategoryId === category.id
                          ? 'bg-[#FFC017] text-[#0d0d0d] hover:bg-[#FFC017]'
                          : ''
                      }`}
                      onClick={() => handleCategoryChange(category.id)}
                    >
                      {category.name} ({categoryCount})
                    </Button>
                  );
                })
              ) : (
                <div className="text-white">No categories available</div>
              )}
            </div>
            {selectedCategoryId !== null && tags.length > 0 && (
              <div className="tags-container text-center py-2 sm:py-4 w-full mt-2">
                <h3 className="text-[1.5rem] font-normal text-white mb-2 sm:mb-4">
                  Tags
                </h3>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                  {tags.map((tag) => (
                    <Button
                      key={tag.id}
                      className={`text-white rounded-full border border-white text-base font-normal ${
                        selectedTagId === tag.id
                          ? 'bg-[#FFC017] text-[#0d0d0d] hover:bg-[#FFC017]'
                          : ''
                      }`}
                      onClick={() => handleTagChange(tag.id)}
                    >
                      {formatTagsButton([tag])} ({tag.count})
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sort-order-container flex flex-col lg:flex-row items-center text-center flex-wrap">
          <div className="flex flex-col justify-start py-4 px-4 lg:px-44 flex-shrink w-full lg:w-auto">
            <label htmlFor="sortOrder1" className="text-[#263238] font-bold">
              Sort by:
            </label>
            <select
              id="sortOrder1"
              className="ml-2 p-2 border w-full lg:w-fit ios-select text-black"
              value={sortOrder}
              onChange={handleSortOrderChange}
            >
              <option value="recent">Most Recent</option>
              <option value="saved">Most Saved</option>
              <option value="comment">Most Comments</option>
            </select>
          </div>
          <div className="flex flex-col justify-start py-4 px-4 lg:px-44 flex-shrink w-full lg:w-auto">
            <label htmlFor="sortOrder2" className="text-[#263238] font-bold">
              Sort by Length:
            </label>
            <select
              id="sortOrder2"
              className="ml-2 p-2 border w-full lg:w-fit ios-select text-black"
              value={sortOrder2}
              onChange={handleSortOrder2Change}
            >
              <option value="All">All</option>
              <option value="short">Short (≤ 1000 characters)</option>
              <option value="medium">Medium (1000-3000 characters)</option>
              <option value="long">Long (≥ 3000 characters)</option>
            </select>
          </div>
        </div>

        <div className="articles-content flex-grow flex justify-center py-8 px-4 bg-inherit">
          <div className="bg-inherit posts-container w-full max-w-screen-lg mx-auto px-2 sm:px-4">
            {loading ? (
              <div className="flex justify-center mt-8">
                <Image
                  src="/BLOGCHAIN.gif"
                  width={200}
                  height={200}
                  alt="Blogchain Logo"
                  className="animate-bounce"
                />
              </div>
            ) : (
              <div className="posts-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6">
                {renderPosts}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer setShowLoginModal={setShowLoginCard} />
      {showLoginCard && (
        <div className="w-screen fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="relative bg-white p-8 rounded-lg shadow-lg">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <img
                src="/close-circle-svgrepo-com.png"
                alt="Remove"
                className="size-7 cursor-pointer hover:animate-pulse"
              />
            </button>
            <LoginCard onClose={handleCloseModal} />
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Articles);
