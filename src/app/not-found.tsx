import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-navy-900">
      <div className="text-center px-4">
        <h1 className="text-7xl sm:text-9xl font-bold gradient-text mb-4">
          404
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          This page doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-flex px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/25"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
