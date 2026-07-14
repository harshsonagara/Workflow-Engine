import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-center px-6">
      <p className="text-8xl font-bold text-[#F27823]">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-[#323232]">Page not found</h1>
      <p className="mt-2 text-gray-500">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 bg-[#F27823] text-white rounded-lg hover:bg-[#F57220] transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
