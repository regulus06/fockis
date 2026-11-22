/** Initial Website Studio categories. Admins can add/rename/reorder/delete in the Administration Center. */
export interface CategorySeed {
  name: string;
  slug: string;
  group: string;
  icon: string;
}

const GROUPS: Record<string, [string, string][]> = {
  Business: [
    ['Business and Corporate', 'Briefcase'], ['Consulting', 'Lightbulb'], ['Marketing Agency', 'Megaphone'],
    ['Technology Company', 'Cpu'], ['Professional Services', 'BadgeCheck'], ['Construction', 'HardHat'], ['Manufacturing', 'Factory'],
  ],
  'Food and Hospitality': [
    ['Bakery', 'CakeSlice'], ['Restaurant', 'UtensilsCrossed'], ['Cafe', 'Coffee'], ['Coffee Shop', 'CupSoda'],
    ['Catering', 'ChefHat'], ['Food Truck', 'Truck'], ['Hotel', 'Hotel'], ['Travel and Hospitality', 'Plane'],
  ],
  'Retail and Shopping': [
    ['General Retail', 'ShoppingBag'], ['Fashion', 'Shirt'], ['Clothing', 'Shirt'], ['Electronics', 'Headphones'],
    ['Furniture', 'Sofa'], ['Beauty Products', 'Sparkles'], ['Jewelry', 'Gem'], ['Grocery', 'ShoppingBasket'],
    ['Pet Supplies', 'PawPrint'], ['Bookstores', 'BookOpen'], ['Automotive Parts', 'Wrench'], ['Hardware', 'Hammer'], ['Gift Shops', 'Gift'],
  ],
  'Beauty and Personal Services': [
    ['Beauty Studio', 'Sparkles'], ['Hair Salon', 'Scissors'], ['Barbershop', 'Scissors'], ['Nail Salon', 'Hand'],
    ['Spa', 'Flower2'], ['Makeup Artist', 'Brush'], ['Skincare', 'Droplet'], ['Wellness', 'HeartPulse'],
  ],
  Creative: [
    ['Photography', 'Camera'], ['Videography', 'Video'], ['Music Studio', 'Music'], ['Recording Studio', 'Mic'],
    ['Creative Agency', 'Palette'], ['Graphic Design', 'PenTool'], ['Portfolio', 'LayoutGrid'], ['Art Gallery', 'Frame'],
  ],
  Organizations: [
    ['Church', 'Church'], ['Religious Organizations', 'BookHeart'], ['Nonprofit', 'HeartHandshake'], ['Community Organization', 'Users'],
    ['Associations', 'Network'], ['Clubs', 'Trophy'], ['Foundations', 'Landmark'],
  ],
  Other: [
    ['Real Estate', 'Home'], ['Education', 'GraduationCap'], ['Healthcare', 'Stethoscope'], ['Fitness', 'Dumbbell'],
    ['Sports', 'Volleyball'], ['Events', 'PartyPopper'], ['Wedding', 'Heart'], ['Legal Services', 'Scale'],
    ['Personal Websites', 'User'], ['Blogs', 'PenLine'], ['News and Magazine', 'Newspaper'], ['Automotive Dealership', 'Car'],
    ['Agriculture', 'Wheat'], ['Architecture', 'Ruler'], ['Interior Design', 'Lamp'],
  ],
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function categorySeeds(): CategorySeed[] {
  const out: CategorySeed[] = [];
  const seen = new Set<string>();
  for (const [group, items] of Object.entries(GROUPS)) {
    for (const [name, icon] of items) {
      const slug = slugify(name);
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({ name, slug, group, icon });
    }
  }
  return out;
}
