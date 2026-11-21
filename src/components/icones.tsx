import {
  Award, BadgeCheck, Bolt, BookOpen, Brain, Briefcase, Building2, CalendarCheck, ChartBar, ChartLine, ChartPie,
  CirclePlay, Clock, Code2, Coins, Compass, Cpu, Crown, Droplet, Eye, Feather, Fingerprint, Flag, Flame, Footprints,
  Gauge, Gem, Globe, GraduationCap, HandCoins, Handshake, Heart, Hexagon, Hourglass, Infinity as Infini, Landmark,
  Laptop, Leaf, Library, Lightbulb, ListChecks, MailCheck, Map, Medal, Megaphone, MessageCircle, Mic, Moon,
  Mountain, Network, Notebook, Orbit, Palette, PenTool, PiggyBank, Presentation, Puzzle, Recycle, Ribbon, Rocket,
  Scale, ScrollText, Shield, ShieldCheck, Snowflake, Sparkles, Sprout, Stamp, Star, Sun, Swords, Target, ThumbsUp,
  Timer, TreePine, TrendingUp, Trophy, UserCheck, Users, Wallet, Waves, Wind, Zap, type LucideIcon,
} from "lucide-react";

/**
 * Icônes choisies par nom (badges, domaines). Un registre fermé plutôt que
 * tout lucide : l'éditeur de badges propose cette liste, et le paquet client
 * n'embarque pas 1 500 icônes inutiles.
 */
export const ICONES: Record<string, LucideIcon> = {
  Award, BadgeCheck, Bolt, BookOpen, Brain, Briefcase, Building2, CalendarCheck, ChartBar, ChartLine, ChartPie,
  CirclePlay, Clock, Code2, Coins, Compass, Cpu, Crown, Droplet, Eye, Feather, Fingerprint, Flag, Flame, Footprints,
  Gauge, Gem, Globe, GraduationCap, HandCoins, Handshake, Heart, Hexagon, Hourglass, Infini, Landmark, Laptop, Leaf,
  Library, Lightbulb, ListChecks, MailCheck, Map, Medal, Megaphone, MessageCircle, Mic, Moon, Mountain, Network,
  Notebook, Orbit, Palette, PenTool, PiggyBank, Presentation, Puzzle, Recycle, Ribbon, Rocket, Scale, ScrollText,
  Shield, ShieldCheck, Snowflake, Sparkles, Sprout, Stamp, Star, Sun, Swords, Target, ThumbsUp, Timer, TreePine,
  TrendingUp, Trophy, UserCheck, Users, Wallet, Waves, Wind, Zap,
};

export const NOMS_ICONES = Object.keys(ICONES);

export function Icone({ nom, className, strokeWidth }: { nom: string; className?: string; strokeWidth?: number }) {
  const C = ICONES[nom] ?? Sparkles;
  return <C className={className} strokeWidth={strokeWidth} aria-hidden />;
}
