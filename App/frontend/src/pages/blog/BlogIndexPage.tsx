import { Link } from 'react-router-dom';
import { blogPosts, getBlogRoute } from '@/lib/blog';
import Navbar from '@/components/Navbar';

const BlogIndexPage = () => (
  <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(142,156,195,0.12),_transparent_36%),linear-gradient(180deg,_#FDF8F5_0%,_#F5EDE6_100%)] text-[#2D2226]">
    <Navbar />
    <section className="mx-auto max-w-5xl px-6 pt-28 pb-16 sm:pt-32 sm:pb-20">
      <div className="max-w-3xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#B8706A]">
          BeautyFit Blog
        </p>
        <h1 className="font-display text-4xl leading-tight text-[#2D2226] sm:text-5xl">
          Beauty Tips, AI Insights & Personal Style Guides
        </h1>
        <p className="text-lg leading-8 text-[#5C4A42]/80">
          Explore our articles on AI-powered beauty analysis, personalized makeup
          recommendations, and style inspiration tailored to your unique features.
        </p>
      </div>

      <div className="mt-12 grid gap-6">
        {blogPosts.length > 0 ? (
          blogPosts.map((post) => (
            <article
              key={post.slug}
              className="rounded-3xl border border-[#E8DDD6] bg-white/90 p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C4A42]/60">
                {post.frontmatter.date ? <span>{post.frontmatter.date}</span> : null}
                {post.frontmatter.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#F0F2F8] px-3 py-1 text-[#8E9CC3] text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="mt-4 font-display text-2xl text-[#2D2226]">
                <Link className="hover:text-[#B8706A] transition-colors" to={getBlogRoute(post.slug)}>
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 text-base leading-7 text-[#5C4A42]/80">
                {post.description}
              </p>
              <Link
                to={getBlogRoute(post.slug)}
                className="mt-5 inline-flex text-sm font-semibold text-[#B8706A] underline underline-offset-4 hover:text-[#8E9CC3] transition-colors"
              >
                Read article →
              </Link>
            </article>
          ))
        ) : (
          <section className="rounded-[2rem] border border-dashed border-[#E8DDD6] bg-white/80 p-8">
            <h2 className="font-display text-2xl text-[#2D2226]">No articles yet</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#5C4A42]/80">
              Articles will appear here soon. Stay tuned for beauty tips and AI insights!
            </p>
          </section>
        )}
      </div>
    </section>
  </main>
);

export default BlogIndexPage;