import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';

type BlogArticleLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

const BlogArticleLayout = ({
  title,
  description,
  children,
}: BlogArticleLayoutProps) => (
  <main className="min-h-screen bg-[linear-gradient(180deg,_#FDF8F5_0%,_#F5EDE6_100%)] text-[#2D2226]">
    <Navbar />
    <div className="mx-auto max-w-4xl px-6 pt-28 sm:pt-32">
      <Link
        to="/blog"
        className="text-sm text-[#5C4A42]/60 underline-offset-4 hover:text-[#B8706A] hover:underline transition-colors"
      >
        ← Back to blog
      </Link>
    </div>
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="border-b border-[#E8DDD6] pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B8706A]">
          BeautyFit Blog
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight text-[#2D2226] sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5C4A42]/80">
            {description}
          </p>
        ) : null}
      </header>

      <div className="mt-10">{children}</div>
    </article>
  </main>
);

export default BlogArticleLayout;