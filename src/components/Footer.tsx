import { Linkedin, BookOpen, Mail, Github } from "lucide-react";

const socialLinks = [
  {
    href: "https://linkedin.com/in/ajaykumar1295",
    icon: Linkedin,
    label: "LinkedIn",
  },
  {
    href: "https://medium.com/@ajaykumar129595",
    icon: BookOpen,
    label: "Medium",
  },
  {
    href: "mailto:ajaykumar129595@gmail.com",
    icon: Mail,
    label: "Email",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-charcoal-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Ajay Kumar. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label={link.label}
              >
                <link.icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
