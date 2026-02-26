/**
 * Augment LucideProps so color/stroke/fill are accepted (supported at runtime).
 */
export {};
declare module "lucide-react-native" {
  interface LucideProps {
    color?: string;
    stroke?: string;
    fill?: string;
    style?: unknown;
  }
}
