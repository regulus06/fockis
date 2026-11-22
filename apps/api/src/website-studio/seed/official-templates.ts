/**
 * ============================================================================
 * THE FIVE OFFICIAL FOCKIS TEMPLATES (+ the universal business template)
 * ============================================================================
 * Each template recreates its supplied reference design with real, editable
 * sections. Images under /website-studio/<template>/ were extracted from the
 * reference designs so the default websites match them visually.
 * ============================================================================
 */
import {
  IdFactory,
  TemplateDefinition,
  content,
  defaultSettings,
  nav,
  page,
  product,
  section,
  service,
  staff,
} from './template-builder';
import { accountPage, cartPage, contactSection, galleryPage, heading, mapSection } from './common-pages';

const A = (t: string, f: string) => `/website-studio/${t}/${f}`;

/* ============================================================================
 * 1. SWEET CRUMBS BAKERY
 * ========================================================================== */
export function sweetCrumbsBakery(): TemplateDefinition {
  const ids = new IdFactory('bk');
  const img = (f: string) => A('bakery', f);
  const theme = {
    skin: 'bakery',
    colors: {
      primary: '#8A2B0E',
      primaryText: '#FFFFFF',
      secondary: '#FBF0E8',
      accent: '#E8A1B4',
      background: '#FFFDFB',
      surface: '#FBF1EA',
      text: '#3D2219',
      heading: '#2A120A',
      muted: '#6E5045',
      border: '#EBD8CB',
      headerBg: '#FBF1EA',
      headerText: '#2A120A',
      topBarBg: '#8A2B0E',
      topBarText: '#FFFFFF',
      footerBg: '#2A120A',
      footerText: '#F6E7DC',
    },
    fonts: { heading: 'Libre Caslon Text', body: 'Jost', script: 'Great Vibes', nav: 'Jost' },
    radius: 12,
    buttonShape: 'rounded' as const,
    maxWidth: 1320,
  };

  const products = [
    product('bk-croissant', 'Butter Croissant', 3.75, 'Pastries', img('cat-pastries.jpg'), { featured: true, tags: ['bestseller'], description: 'Flaky, golden, laminated with French butter and baked every morning.' }),
    product('bk-almond', 'Almond Croissant', 4.5, 'Pastries', img('cat-pastries.jpg'), { description: 'Filled with almond cream and topped with toasted almonds.' }),
    product('bk-berry-cupcake', 'Berry Cream Cupcake', 3.95, 'Cupcakes', img('cat-cupcakes.jpg'), { featured: true, tags: ['bestseller'], description: 'Chocolate cupcake with strawberry buttercream and fresh berries.' }),
    product('bk-sprinkle-cupcake', 'Funfetti Cupcake', 3.5, 'Cupcakes', img('cat-cupcakes.jpg'), { description: 'Vanilla sponge, pink frosting and rainbow sprinkles.' }),
    product('bk-sourdough', 'Country Sourdough Loaf', 8, 'Breads', img('cat-breads.jpg'), { featured: true, description: 'Naturally leavened, 24-hour fermented, crackly crust.' }),
    product('bk-multigrain', 'Multigrain Bread', 7, 'Breads', img('cat-breads.jpg'), { description: 'Seeded whole-grain loaf, perfect for sandwiches.' }),
    product('bk-choc-cake', 'Chocolate Raspberry Cake (slice)', 6.5, 'Cakes', img('cat-cakes.jpg'), { featured: true, tags: ['bestseller'], description: 'Layers of dark chocolate sponge, ganache and raspberries.' }),
    product('bk-drip-cake', 'Chocolate Drip Celebration Cake', 48, 'Cakes', img('hero.jpg'), { description: 'Vanilla bean cake, chocolate drip and seasonal fruit. Serves 12.' }),
    product('bk-cookies', 'Chocolate Chip Cookies (6)', 9, 'Cookies', img('cat-cookies.jpg'), { featured: true, description: 'Brown-butter cookies loaded with dark chocolate.' }),
    product('bk-macarons', 'French Macarons (box of 6)', 14, 'Desserts', img('cat-desserts.jpg'), { featured: true, tags: ['new'], description: 'Pistachio, raspberry, lemon, vanilla and more.' }),
  ];

  const header = section(
    ids,
    'header',
    {
      layout: 'standard',
      logoStyle: 'bakery',
      logoText: 'Sweet Crumbs',
      logoSubtext: 'Bakery',
      logoIcon: 'CakeSlice',
      showTopBar: false,
      topBarLeft: [],
      topBarRight: [],
      showSearch: true,
      showAccount: true,
      showCart: true,
      showWishlist: false,
      cta: { label: 'Order Online', href: 'page:shop', icon: 'ShoppingBag' },
      sticky: true,
    },
    {},
    'bakery',
  );

  const footer = section(
    ids,
    'footer',
    {
      about: 'Artisan pastries, delicious cakes, and homemade treats baked with love every single day.',
      columns: [
        { title: 'Explore', links: [['Menu', 'page:menu'], ['Custom Cakes', 'page:custom-cakes'], ['Shop', 'page:shop'], ['Gallery', 'page:gallery']] },
        { title: 'Bakery', links: [['Our Story', 'page:about'], ['Contact', 'page:contact'], ['My Account', 'page:account']] },
      ],
      showHours: true,
      showContact: true,
      showSocial: true,
      copyright: '© {year} Sweet Crumbs Bakery. All rights reserved.',
    },
    {},
    'bakery',
  );

  const favorites = (eyebrow = 'OUR MENU', title = 'Our Bakery Favorites') =>
    section(
      ids,
      'category-cards',
      {
        eyebrow,
        title,
        headingStyle: 'lines',
        items: [
          { image: img('cat-pastries.jpg'), label: 'Pastries', icon: '', href: 'page:menu?category=Pastries' },
          { image: img('cat-cupcakes.jpg'), label: 'Cupcakes', icon: '', href: 'page:menu?category=Cupcakes' },
          { image: img('cat-breads.jpg'), label: 'Breads', icon: '', href: 'page:menu?category=Breads' },
          { image: img('cat-cakes.jpg'), label: 'Cakes', icon: '', href: 'page:menu?category=Cakes' },
          { image: img('cat-cookies.jpg'), label: 'Cookies', icon: '', href: 'page:menu?category=Cookies' },
          { image: img('cat-desserts.jpg'), label: 'Desserts', icon: '', href: 'page:menu?category=Desserts' },
        ],
      },
      { paddingTop: 40, paddingBottom: 56, background: '#FFFDFB', maxWidth: 1500, columns: 6, responsive: { tablet: { columns: 3 }, mobile: { columns: 2 } } },
      'caption-below',
    );

  const home = page(
    ids,
    {
      title: 'Home',
      slug: 'home',
      isHomepage: true,
      seoDescription: 'Artisan pastries, delicious cakes, and homemade treats baked with love.',
      sections: [
        section(
          ids,
          'hero',
          {
            eyebrowStyle: 'icon-lines',
            eyebrowIcon: 'Heart',
            eyebrow: '',
            title: 'Freshly Baked Goodness',
            titleAccent: '',
            subtitle: 'Artisan pastries, delicious cakes, and homemade treats baked with love.',
            buttons: [
              { label: 'Order Online', href: 'page:shop', icon: 'ShoppingCart', style: 'primary' },
              { label: 'Custom Cake Request', href: 'page:custom-cakes', icon: 'CakeSlice', style: 'outline' },
            ],
            image: img('hero.jpg'),
            decorImage: img('hero-flowers.jpg'),
            images: [img('hero.jpg')],
            showArrows: false,
          },
          { minHeight: 454, background: '#F8EDE5', paddingTop: 0, paddingBottom: 0, responsive: { mobile: { minHeight: 0 } } },
          'bakery',
        ),
        section(
          ids,
          'features-strip',
          {
            dividers: true,
            items: [
              { icon: 'Truck', title: 'Pickup & Delivery', text: 'Get your favorites your way' },
              { icon: 'CakeSlice', title: 'Custom Cakes', text: 'For birthdays, weddings & more' },
              { icon: 'Leaf', title: 'Fresh Ingredients', text: 'Quality you can taste' },
              { icon: 'Award', title: 'Baked with Love', text: 'From our oven to your table.' },
            ],
          },
          { background: '#FBF1EA', paddingTop: 22, paddingBottom: 22, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } },
          'strip',
        ),
        favorites(),
        section(
          ids,
          'product-grid',
          {
            eyebrow: 'FRESH TODAY',
            title: 'Customer Favorites',
            headingStyle: 'lines',
            tabs: [],
            filter: 'featured',
            limit: 4,
            showRatings: false,
            showWishlist: false,
            buttonLabel: 'Add to Order',
          },
          { background: '#FBF6F2', paddingTop: 64, paddingBottom: 64, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } },
          'soft',
        ),
        section(
          ids,
          'image-text',
          {
            eyebrow: 'OUR STORY',
            title: 'A Neighborhood Bakery Since 2009',
            body: 'Every morning before sunrise our bakers fold butter into dough, proof our sourdough and pipe fresh frosting. We bake in small batches with real ingredients — no shortcuts, just the recipes our family has loved for generations.',
            image: img('cat-breads.jpg'),
            imageSide: 'left',
            buttons: [{ label: 'Read Our Story', href: 'page:about', icon: 'ArrowRight', style: 'outline' }],
          },
          { paddingTop: 72, paddingBottom: 72 },
        ),
        section(
          ids,
          'promo-banner',
          {
            image: img('hero.jpg'),
            scriptTitle: 'Celebrate with us',
            title: 'Custom Cakes for Every Occasion',
            text: 'Birthdays, weddings, showers and more — choose your size, flavor, filling and decoration.',
            price: '',
            button: { label: 'Design Your Cake', href: 'page:custom-cakes', icon: 'CakeSlice' },
          },
          { background: '#8A2B0E', textColor: '#FFFFFF', paddingTop: 0, paddingBottom: 0 },
          'split-soft',
        ),
        section(
          ids,
          'testimonials',
          {
            eyebrow: 'KIND WORDS',
            title: 'Loved by Our Neighbors',
            items: [
              { quote: 'The croissants are the best in Columbus — flaky and buttery every time.', name: 'Amanda R.', rating: 5 },
              { quote: 'Our wedding cake was stunning and tasted even better than it looked.', name: 'James & Lia', rating: 5 },
              { quote: 'Ordering online for pickup is so easy. My Saturday ritual!', name: 'Marcus T.', rating: 5 },
            ],
          },
          { background: '#FFFDFB', paddingTop: 72, paddingBottom: 72, columns: 3, responsive: { mobile: { columns: 1 } } },
        ),
        section(
          ids,
          'hours',
          { title: 'Visit the Bakery', text: 'Fresh bread comes out of the oven at 7 AM. Come early for warm croissants!', showAddress: true, showPhone: true },
          { background: '#FBF1EA', paddingTop: 56, paddingBottom: 56 },
        ),
      ],
    },
    0,
  );

  const about = page(
    ids,
    {
      title: 'Our Story',
      slug: 'about',
      sections: [
        heading(ids, 'ABOUT US', 'Our Story', 'From a tiny family kitchen to your favorite neighborhood bakery.'),
        section(ids, 'image-text', {
          eyebrow: '', title: 'Baked from Scratch, Every Day',
          body: 'Sweet Crumbs started with a grandmother’s recipe box and a dream. Today our team of bakers still mixes, shapes and bakes everything by hand using fresh, locally sourced ingredients.',
          image: img('cat-pastries.jpg'), imageSide: 'right', buttons: [],
        }, { paddingTop: 40, paddingBottom: 72 }),
        section(ids, 'stats', { items: [{ value: '15+', label: 'Years baking' }, { value: '40', label: 'Daily recipes' }, { value: '12k', label: 'Happy customers' }, { value: '100%', label: 'Made by hand' }] }, { background: '#FBF1EA', paddingTop: 48, paddingBottom: 48, columns: 4, responsive: { mobile: { columns: 2 } } }),
      ],
    },
    1,
  );

  const menu = page(
    ids,
    {
      title: 'Menu',
      slug: 'menu',
      sections: [
        heading(ids, 'OUR MENU', 'Fresh From Our Oven', 'Browse everything we bake. Order ahead for pickup or delivery.'),
        section(ids, 'product-catalog', { showSearch: true, showCategories: true, showSort: true, showAddToCart: true, layout: 'grid', filterTag: '' }, { paddingTop: 16, paddingBottom: 80, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }, 'soft'),
      ],
    },
    2,
  );

  const cakes = page(
    ids,
    {
      title: 'Custom Cakes',
      slug: 'custom-cakes',
      sections: [
        heading(ids, 'MADE FOR YOU', 'Custom Cake Request', 'Choose a size, flavor, filling, frosting and decoration. We’ll bake it fresh for your pickup or delivery date.'),
        section(ids, 'custom-cake-form', { title: 'Design Your Cake', submitLabel: 'Add Cake to Order', note: 'Custom cakes require 48 hours notice.' }, { paddingTop: 16, paddingBottom: 80 }),
      ],
    },
    3,
  );

  const shop = page(
    ids,
    {
      title: 'Shop',
      slug: 'shop',
      sections: [
        heading(ids, 'ORDER ONLINE', 'Shop Our Bakery', 'Add your favorites to the cart and choose pickup or delivery at checkout.'),
        section(ids, 'product-catalog', { showSearch: true, showCategories: true, showSort: true, showAddToCart: true, layout: 'grid', filterTag: '' }, { paddingTop: 16, paddingBottom: 80, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }, 'soft'),
      ],
    },
    4,
  );

  const gallery = galleryPage(ids, 5, [
    img('hero.jpg'), img('cat-pastries.jpg'), img('cat-cupcakes.jpg'), img('cat-breads.jpg'),
    img('cat-cakes.jpg'), img('cat-cookies.jpg'), img('cat-desserts.jpg'), img('hero-flowers.jpg'),
  ]);

  const contact = page(ids, { title: 'Contact', slug: 'contact', sections: [contactSection(ids, 'We’d Love to Hear From You', 'Questions about an order, a custom cake or catering? Send us a message.'), mapSection(ids)] }, 6);

  return {
    slug: 'sweet-crumbs-bakery',
    name: 'Sweet Crumbs Bakery',
    description: 'Warm cream and brown bakery design with pink accents, online ordering, custom cakes, pickup and delivery.',
    categorySlugs: ['bakery', 'cafe', 'coffee-shop'],
    isDefaultFor: ['bakery'],
    isFeatured: true,
    accessLevel: 'free',
    thumbnail: img('preview.jpg'),
    previewImages: [img('preview.jpg')],
    tags: ['official', 'bakery', 'ecommerce', 'custom-cakes'],
    content: content({
      theme,
      header,
      footer,
      navigation: nav(ids, [['Home', 'page:home'], ['About', 'page:about'], ['Menu', 'page:menu'], ['Custom Cakes', 'page:custom-cakes'], ['Shop', 'page:shop'], ['Gallery', 'page:gallery'], ['Contact', 'page:contact']]),
      pages: [home, about, menu, cakes, shop, gallery, contact, cartPage(ids, 7), accountPage(ids, 8)],
      settings: defaultSettings({
        businessName: 'Sweet Crumbs Bakery',
        tagline: 'Baked with love',
        logoIcon: 'CakeSlice',
        phone: '(614) 555-0142',
        email: 'hello@sweetcrumbs.com',
        address: '210 High St, Columbus, OH 43215',
        hours: [{ label: 'Mon – Fri', value: '7:00 AM – 6:00 PM' }, { label: 'Saturday', value: '7:00 AM – 4:00 PM' }, { label: 'Sunday', value: '8:00 AM – 2:00 PM' }],
        features: { cart: true, booking: false, reservations: false, customCakes: true, delivery: true, pickup: true, shipping: false, wishlist: false, accounts: true },
        cakeOptions: {
          sizes: [{ label: '6" (serves 8)', price: 38 }, { label: '8" (serves 12)', price: 52 }, { label: '10" (serves 20)', price: 72 }, { label: '2-Tier (serves 40)', price: 160 }],
          flavors: ['Vanilla Bean', 'Chocolate', 'Red Velvet', 'Lemon', 'Carrot', 'Strawberry'],
          fillings: ['None', 'Raspberry', 'Strawberry', 'Chocolate Ganache', 'Lemon Curd', 'Salted Caramel'],
          frostings: ['Vanilla Buttercream', 'Chocolate Buttercream', 'Cream Cheese', 'Whipped Cream', 'Fondant'],
          decorationFee: 12,
          leadTimeDays: 2,
        },
        seo: { siteTitle: 'Sweet Crumbs Bakery — Freshly Baked Goodness', description: 'Artisan pastries, delicious cakes, and homemade treats baked with love. Order online for pickup or delivery.', ogImage: img('preview.jpg'), allowIndexing: true },
      }),
      products,
      productCategories: ['Pastries', 'Cupcakes', 'Breads', 'Cakes', 'Cookies', 'Desserts'],
    }),
  };
}

/* ============================================================================
 * 2. FOCKIS RESTAURANT
 * ========================================================================== */
export function fockisRestaurant(): TemplateDefinition {
  const ids = new IdFactory('rs');
  const img = (f: string) => A('restaurant', f);
  const theme = {
    skin: 'restaurant',
    colors: {
      primary: '#B5121B',
      primaryText: '#FFFFFF',
      secondary: '#7A0A0E',
      accent: '#FFC72C',
      background: '#FFFFFF',
      surface: '#F7F4F1',
      text: '#1F1A17',
      heading: '#111111',
      muted: '#5D5550',
      border: '#E7E1DC',
      headerBg: '#0D0B0A',
      headerText: '#FFFFFF',
      topBarBg: '#0D0B0A',
      topBarText: '#FFFFFF',
      footerBg: '#0D0B0A',
      footerText: '#EDE7E2',
    },
    fonts: { heading: 'Merriweather', body: 'Nunito Sans', script: 'Kaushan Script', nav: 'Nunito Sans' },
    radius: 12,
    buttonShape: 'pill' as const,
    maxWidth: 1480,
  };

  const products = [
    product('rs-classic-burger', 'Classic Cheeseburger', 13.99, 'Burgers', img('dish-burgers.jpg'), { featured: true, tags: ['bestseller'], description: 'Half-pound beef patty, cheddar, lettuce, tomato and house sauce on a brioche bun.' }),
    product('rs-bbq-burger', 'Smokehouse BBQ Burger', 15.49, 'Burgers', img('dish-burgers.jpg'), { description: 'Bacon, onion rings, smoked cheddar and BBQ glaze.' }),
    product('rs-grilled-chicken', 'Grilled Chicken & Rice', 16.99, 'Chicken', img('dish-chicken.jpg'), { featured: true, description: 'Herb-marinated chicken breast with seasoned rice and salad.' }),
    product('rs-ribeye', 'Grilled Ribeye Steak', 29.99, 'Steaks', img('hero.jpg'), { featured: true, tags: ['bestseller'], description: '12 oz ribeye with mashed potatoes and roasted vegetables.' }),
    product('rs-sirloin', 'Peppercorn Sirloin', 24.99, 'Steaks', img('dish-steaks.jpg'), { description: '8 oz sirloin, peppercorn sauce and fresh herbs.' }),
    product('rs-shrimp-pasta', 'Shrimp Scampi Pasta', 18.99, 'Pasta', img('dish-pasta.jpg'), { featured: true, description: 'Fettuccine, garlic butter shrimp, tomatoes and basil.' }),
    product('rs-chicken-salad', 'Grilled Chicken Salad', 13.49, 'Salads', img('dish-salads.jpg'), { featured: true, description: 'Mixed greens, feta, tomatoes, cucumber and lemon vinaigrette.' }),
    product('rs-choc-cake', 'Triple Chocolate Cake', 8.99, 'Desserts', img('dish-desserts.jpg'), { featured: true, description: 'Layered chocolate cake with ganache and berries.' }),
    product('rs-salmon', 'Grilled Salmon Plate', 18.99, 'Specials', img('special.jpg'), { featured: true, tags: ['special'], description: 'Served with seasoned rice, fresh vegetables, and lemon butter sauce.' }),
  ];

  const header = section(ids, 'header', {
    layout: 'standard',
    logoStyle: 'restaurant',
    logoText: 'Fockis',
    logoSubtext: 'Restaurant',
    logoIcon: 'ChefHat',
    showTopBar: false,
    topBarLeft: [],
    topBarRight: [],
    showSearch: true,
    showAccount: true,
    showCart: true,
    cta: { label: 'Order Online', href: 'page:menu', icon: 'ShoppingBag' },
    sticky: true,
  }, {}, 'restaurant');

  const footer = section(ids, 'footer', {
    about: 'Delicious food, great service and a warm family atmosphere — dine in, take out or get it delivered.',
    columns: [
      { title: 'Restaurant', links: [['Menu', 'page:menu'], ['Reservations', 'page:reservations'], ['Catering', 'page:catering'], ['Events', 'page:events']] },
      { title: 'Information', links: [['About Us', 'page:about'], ['Gallery', 'page:gallery'], ['Contact', 'page:contact'], ['My Orders', 'page:account']] },
    ],
    showHours: true, showContact: true, showSocial: true,
    copyright: '© {year} Fockis Restaurant. All rights reserved.',
  }, {}, 'restaurant');

  const dishes = section(ids, 'category-cards', {
    eyebrow: 'Our Menu',
    title: 'Popular Dishes',
    headingStyle: 'lines',
    items: [
      { image: img('dish-burgers.jpg'), label: 'Burgers', icon: 'UtensilsCrossed', href: 'page:menu?category=Burgers' },
      { image: img('dish-chicken.jpg'), label: 'Chicken', icon: 'Drumstick', href: 'page:menu?category=Chicken' },
      { image: img('dish-steaks.jpg'), label: 'Steaks', icon: 'Beef', href: 'page:menu?category=Steaks' },
      { image: img('dish-pasta.jpg'), label: 'Pasta', icon: 'Soup', href: 'page:menu?category=Pasta' },
      { image: img('dish-salads.jpg'), label: 'Salads', icon: 'Salad', href: 'page:menu?category=Salads' },
      { image: img('dish-desserts.jpg'), label: 'Desserts', icon: 'CakeSlice', href: 'page:menu?category=Desserts' },
    ],
  }, { paddingTop: 32, paddingBottom: 32, columns: 6, responsive: { tablet: { columns: 3 }, mobile: { columns: 2 } } }, 'caption-bar');

  const home = page(ids, {
    title: 'Home', slug: 'home', isHomepage: true,
    seoDescription: 'Fresh, chef-crafted meals, your favorite dishes, and a warm dining experience.',
    sections: [
      section(ids, 'hero', {
        eyebrowStyle: 'icon-lines',
        eyebrowIcon: 'UtensilsCrossed',
        preTitle: 'Welcome to',
        title: 'Fockis',
        titleAccent: 'Restaurant',
        accentStyle: 'script',
        accentInline: true,
        tagline: 'Delicious Food • Great Service • Family Atmosphere',
        subtitle: 'Enjoy fresh, chef-crafted meals, your favorite dishes, and a warm dining experience.',
        contentAlign: 'center',
        buttons: [
          { label: 'Order Online', href: 'page:menu', icon: 'ShoppingBag', style: 'primary' },
          { label: 'Reserve a Table', href: 'page:reservations', icon: 'CalendarDays', style: 'outline-accent' },
        ],
        image: img('hero.jpg'),
        images: [img('hero.jpg')],
      }, { minHeight: 375, background: '#140F0C', textColor: '#FFFFFF', paddingTop: 0, paddingBottom: 0, responsive: { mobile: { minHeight: 0 } } }, 'overlay'),
      section(ids, 'features-strip', {
        dividers: true,
        items: [
          { icon: 'ConciergeBell', title: 'Dine-In', text: 'Enjoy a great dining experience' },
          { icon: 'ShoppingBag', title: 'Takeout', text: 'Order and pick up quickly' },
          { icon: 'Bike', title: 'Delivery', text: 'Get your favorite meals at home' },
          { icon: 'CalendarDays', title: 'Reservations', text: 'Book your table online' },
          { icon: 'Users', title: 'Catering', text: 'For events, parties & business' },
        ],
      }, { background: '#FFFFFF', paddingTop: 22, paddingBottom: 22, columns: 5, responsive: { tablet: { columns: 3 }, mobile: { columns: 1 } } }, 'strip'),
      dishes,
      section(ids, 'promo-banner', {
        image: img('special.jpg'),
        scriptTitle: 'Special of the Day',
        title: 'Grilled Salmon Plate',
        text: 'Served with seasoned rice, fresh vegetables, and lemon butter sauce.',
        price: '$18.99',
        productId: 'rs-salmon',
        button: { label: 'Order Now', href: 'page:menu', icon: 'ShoppingBag' },
      }, { background: '#16110E', textColor: '#FFFFFF', paddingTop: 0, paddingBottom: 0 }, 'special'),
      section(ids, 'image-text', {
        eyebrow: 'Our Story', title: 'Cooking With Passion Since 2012',
        body: 'At Fockis Restaurant every dish is prepared to order by our chefs using fresh, local ingredients. Whether it is a family dinner, a business lunch or a celebration, we make every visit special.',
        image: img('dish-steaks.jpg'), imageSide: 'right',
        buttons: [{ label: 'About Us', href: 'page:about', icon: 'ArrowRight', style: 'primary' }],
      }, { paddingTop: 80, paddingBottom: 80 }),
      section(ids, 'testimonials', {
        eyebrow: 'Reviews', title: 'What Our Guests Say',
        items: [
          { quote: 'Best steak in town and the service is always friendly.', name: 'Daniel M.', rating: 5 },
          { quote: 'We booked our anniversary dinner online — perfect evening.', name: 'Rosa & Ken', rating: 5 },
          { quote: 'Catering for our office party was a hit. Highly recommend!', name: 'Tasha W.', rating: 5 },
        ],
      }, { background: '#F7F4F1', paddingTop: 72, paddingBottom: 72, columns: 3, responsive: { mobile: { columns: 1 } } }),
      section(ids, 'hours', { title: 'Hours & Location', text: 'Walk-ins welcome. Reservations recommended on weekends.', showAddress: true, showPhone: true }, { background: '#0D0B0A', textColor: '#FFFFFF', paddingTop: 56, paddingBottom: 56 }),
    ],
  }, 0);

  const menu = page(ids, {
    title: 'Menu', slug: 'menu',
    sections: [
      heading(ids, 'Our Menu', 'Order Online', 'Choose dine-in, takeout or delivery at checkout.'),
      section(ids, 'product-catalog', { showSearch: true, showCategories: true, showSort: false, showAddToCart: true, layout: 'list', filterTag: '' }, { paddingTop: 16, paddingBottom: 80, columns: 2, responsive: { mobile: { columns: 1 } } }, 'menu'),
    ],
  }, 1);

  const about = page(ids, {
    title: 'About Us', slug: 'about',
    sections: [
      heading(ids, 'About Us', 'A Family Restaurant With a Chef’s Touch'),
      section(ids, 'image-text', { title: 'Our Kitchen', body: 'Our chefs grill, sauté and plate every order fresh. We source produce from local farms and make our sauces in-house.', image: img('dish-pasta.jpg'), imageSide: 'left', buttons: [] }, { paddingTop: 24, paddingBottom: 72 }),
      section(ids, 'stats', { items: [{ value: '12', label: 'Years serving' }, { value: '60+', label: 'Menu items' }, { value: '4.9★', label: 'Guest rating' }, { value: '300', label: 'Events catered' }] }, { background: '#0D0B0A', textColor: '#FFFFFF', paddingTop: 48, paddingBottom: 48, columns: 4, responsive: { mobile: { columns: 2 } } }),
    ],
  }, 2);

  const reservations = page(ids, {
    title: 'Reservations', slug: 'reservations',
    sections: [
      heading(ids, 'Book a Table', 'Reservations', 'Reserve your table online. We’ll confirm by email.'),
      section(ids, 'reservation-form', { title: 'Reserve a Table', submitLabel: 'Request Reservation' }, { paddingTop: 16, paddingBottom: 80 }),
    ],
  }, 3);

  const catering = page(ids, {
    title: 'Catering', slug: 'catering',
    sections: [
      heading(ids, 'Catering', 'Catering for Every Occasion', 'Office lunches, birthdays, weddings and corporate events.'),
      section(ids, 'contact-form', { eyebrow: '', title: 'Request a Catering Quote', text: 'Tell us about your event and we will send a custom menu and quote.', showInfo: true, showHours: false, submitLabel: 'Request Quote', formType: 'catering', fields: ['name', 'email', 'phone', 'date', 'guests', 'message'] }, { paddingTop: 16, paddingBottom: 80 }),
    ],
  }, 4);

  const events = page(ids, {
    title: 'Events', slug: 'events',
    sections: [
      heading(ids, 'Events', 'Upcoming Events'),
      section(ids, 'events', { items: [
        { title: 'Live Jazz Night', date: 'Every Friday', time: '7:00 PM', description: 'Live music, chef specials and craft cocktails.', image: img('hero.jpg'), location: 'Main dining room' },
        { title: 'Family Sunday Brunch', date: 'Every Sunday', time: '10:00 AM', description: 'Brunch buffet with kids’ corner.', image: img('dish-salads.jpg'), location: 'Patio' },
        { title: 'Private Party Bookings', date: 'Any day', time: 'Flexible', description: 'Reserve our private room for up to 60 guests.', image: img('dish-desserts.jpg'), location: 'Private room' },
      ] }, { paddingTop: 16, paddingBottom: 80, columns: 3, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }),
    ],
  }, 5);

  const contact = page(ids, { title: 'Contact', slug: 'contact', sections: [contactSection(ids, 'Contact Fockis Restaurant', 'Questions, feedback or large party requests — we are happy to help.'), mapSection(ids)] }, 6);
  const gallery = galleryPage(ids, 7, [img('hero.jpg'), img('dish-burgers.jpg'), img('dish-chicken.jpg'), img('dish-steaks.jpg'), img('dish-pasta.jpg'), img('dish-salads.jpg'), img('dish-desserts.jpg'), img('special.jpg')], 'Gallery', {}, false);

  return {
    slug: 'fockis-restaurant',
    name: 'Fockis Restaurant',
    description: 'Dark, appetizing restaurant design with red and gold accents, online ordering, reservations, catering and events.',
    categorySlugs: ['restaurant', 'catering', 'food-truck', 'cafe', 'hotel', 'travel-and-hospitality'],
    isDefaultFor: ['restaurant', 'catering', 'food-truck'],
    isFeatured: true,
    accessLevel: 'free',
    thumbnail: img('preview.jpg'),
    previewImages: [img('preview.jpg')],
    tags: ['official', 'restaurant', 'ordering', 'reservations'],
    content: content({
      theme, header, footer,
      navigation: nav(ids, [['Home', 'page:home'], ['Menu', 'page:menu'], ['About Us', 'page:about'], ['Reservations', 'page:reservations'], ['Catering', 'page:catering'], ['Events', 'page:events'], ['Contact', 'page:contact']]),
      pages: [home, menu, about, reservations, catering, events, contact, gallery, cartPage(ids, 8), accountPage(ids, 9)],
      settings: defaultSettings({
        businessName: 'Fockis Restaurant', tagline: 'Delicious Food • Great Service', logoIcon: 'ChefHat',
        phone: '(614) 555-0188', email: 'reservations@fockisrestaurant.com', address: '88 Market St, Columbus, OH 43215',
        hours: [{ label: 'Mon – Thu', value: '11:00 AM – 10:00 PM' }, { label: 'Fri – Sat', value: '11:00 AM – 11:00 PM' }, { label: 'Sunday', value: '10:00 AM – 9:00 PM' }],
        features: { cart: true, booking: false, reservations: true, customCakes: false, delivery: true, pickup: true, shipping: false, wishlist: false, accounts: true },
        booking: { openTime: '11:00', closeTime: '22:00', daysOpen: [0, 1, 2, 3, 4, 5, 6], slotMinutes: 30, maxPartySize: 20 },
        seo: { siteTitle: 'Fockis Restaurant — Delicious Food, Great Service', description: 'Order online, reserve a table, or book catering at Fockis Restaurant.', ogImage: img('preview.jpg'), allowIndexing: true },
      }),
      products,
      productCategories: ['Burgers', 'Chicken', 'Steaks', 'Pasta', 'Salads', 'Desserts', 'Specials'],
    }),
  };
}

/* ============================================================================
 * 3. FOCKIS RETAIL STORE
 * ========================================================================== */
export function fockisRetailStore(): TemplateDefinition {
  const ids = new IdFactory('rt');
  const img = (f: string) => A('retail', f);
  const theme = {
    skin: 'retail',
    colors: {
      primary: '#0B53DB',
      primaryText: '#FFFFFF',
      secondary: '#0A3A9A',
      accent: '#E3262E',
      background: '#FFFFFF',
      surface: '#EDF3FC',
      text: '#111827',
      heading: '#0B1324',
      muted: '#5B6577',
      border: '#E2E8F0',
      headerBg: '#FFFFFF',
      headerText: '#0B1324',
      topBarBg: '#0A3D91',
      topBarText: '#FFFFFF',
      footerBg: '#0A2A66',
      footerText: '#DCE6F7',
    },
    fonts: { heading: 'Poppins', body: 'Poppins', script: 'Poppins', nav: 'Poppins' },
    radius: 10,
    buttonShape: 'rounded' as const,
    maxWidth: 1480,
  };

  const products = [
    product('rt-laptop', 'Fockis Laptop Pro 15"', 849, 'Electronics', img('p-laptop.jpg'), { compareAtPrice: 999, rating: 4.6, reviewCount: 245, featured: true, tags: ['bestseller', 'sale'], inventory: 25, description: '15.6" display, 16GB RAM, 512GB SSD and all-day battery.', variants: [{ name: 'Memory', options: ['16GB', '32GB'] }] }),
    product('rt-headphones', 'Wireless Headphones', 59.99, 'Electronics', img('p-headphones.jpg'), { rating: 4.5, reviewCount: 1320, featured: true, tags: ['bestseller'], inventory: 120, description: 'Over-ear Bluetooth headphones with 40-hour battery.', variants: [{ name: 'Color', options: ['Silver', 'Black'] }] }),
    product('rt-shoes', 'Sport Running Shoes', 79.99, 'Fashion', img('p-shoes.jpg'), { compareAtPrice: 99.99, rating: 4.7, reviewCount: 892, featured: true, tags: ['new', 'sale'], inventory: 60, description: 'Lightweight running shoes with cushioned sole.', variants: [{ name: 'Size', options: ['7', '8', '9', '10', '11', '12'] }] }),
    product('rt-watch', 'Smartwatch Series 8', 199, 'Electronics', img('p-watch.jpg'), { rating: 4.6, reviewCount: 1154, featured: true, tags: ['new'], inventory: 40, description: 'Fitness tracking, heart-rate and notifications on your wrist.' }),
    product('rt-perfume', 'Luxury Perfume 100ml', 49.99, 'Beauty & Health', img('p-perfume.jpg'), { rating: 4.5, reviewCount: 417, featured: true, tags: ['new'], inventory: 80, description: 'Floral eau de parfum with long-lasting notes.' }),
    product('rt-blender', 'Kitchen Blender 1200W', 89.99, 'Home & Living', img('p-blender.jpg'), { compareAtPrice: 119.99, rating: 4.4, reviewCount: 326, featured: true, tags: ['sale'], inventory: 35, description: '1200W motor, 6 stainless blades, 1.5L glass jar.' }),
    product('rt-hoodie', 'Classic Blue Hoodie', 39.99, 'Fashion', img('cat-fashion.jpg'), { rating: 4.3, reviewCount: 88, tags: ['new'], inventory: 70, variants: [{ name: 'Size', options: ['S', 'M', 'L', 'XL'] }] }),
    product('rt-armchair', 'Velvet Accent Chair', 229, 'Home & Living', img('cat-home.jpg'), { rating: 4.6, reviewCount: 52, inventory: 12 }),
    product('rt-ball', 'Pro Basketball', 29.99, 'Sports & Outdoors', img('cat-sports.jpg'), { rating: 4.7, reviewCount: 140, inventory: 90 }),
    product('rt-bear', 'Plush Teddy Bear', 19.99, 'Toys & Games', img('cat-toys.jpg'), { rating: 4.9, reviewCount: 211, inventory: 50 }),
    product('rt-ring', 'Diamond Solitaire Ring', 499, 'Jewelry & Accessories', img('cat-jewelry.jpg'), { rating: 4.8, reviewCount: 34, inventory: 6 }),
    product('rt-drill', 'Cordless Drill 20V', 69.99, 'Tools & Hardware', img('cat-tools.jpg'), { compareAtPrice: 84.99, rating: 4.6, reviewCount: 190, tags: ['sale'], inventory: 30 }),
    product('rt-petbed', 'Pet Comfort Bed', 34.99, 'Pet Supplies', img('cat-pets.jpg'), { rating: 4.5, reviewCount: 77, inventory: 45 }),
    product('rt-tire', 'All-Season Tire 17"', 119, 'Automotive', img('cat-auto.jpg'), { rating: 4.4, reviewCount: 61, inventory: 24 }),
  ];
  const categories = ['Electronics', 'Fashion', 'Home & Living', 'Beauty & Health', 'Sports & Outdoors', 'Toys & Games', 'Jewelry & Accessories', 'Tools & Hardware', 'Pet Supplies', 'Automotive'];

  const header = section(ids, 'header', {
    layout: 'retail',
    logoStyle: 'retail',
    logoText: 'Fockis',
    logoSubtext: 'Retail Store',
    logoIcon: 'ShoppingBag',
    showTopBar: true,
    topBarLeft: [{ icon: 'Truck', text: 'Free Shipping on Orders $50+' }, { icon: 'RotateCcw', text: 'Easy Returns' }, { icon: 'Headphones', text: '24/7 Customer Support' }],
    topBarRight: [{ icon: 'Truck', text: 'Track Order', href: 'page:account' }, { icon: '', text: 'Help', href: 'page:contact' }, { icon: '', text: 'USD', href: '' }],
    showSearch: true,
    searchPlaceholder: 'Search for products, brands, and more...',
    showAccount: true,
    showWishlist: true,
    showCart: true,
    categoryMenuLabel: 'Shop by Category',
    cta: null,
    sticky: true,
  }, {}, 'retail');

  const footer = section(ids, 'footer', {
    about: 'Electronics, fashion, home, beauty and more — shipped fast with easy returns and secure payment.',
    columns: [
      { title: 'Shop', links: [['All Products', 'page:shop'], ['New Arrivals', 'page:shop?tag=new'], ['Best Sellers', 'page:shop?tag=bestseller'], ['Deals & Offers', 'page:shop?tag=sale']] },
      { title: 'Customer Care', links: [['My Account', 'page:account'], ['Track Order', 'page:account'], ['Shipping & Returns', 'page:about'], ['Contact Us', 'page:contact']] },
    ],
    showHours: false, showContact: true, showSocial: true,
    copyright: '© {year} Fockis Retail Store. All rights reserved.',
  }, {}, 'retail');

  const tiles = section(ids, 'category-tiles', {
    items: [
      ['cat-electronics.jpg', 'Electronics'], ['cat-fashion.jpg', 'Fashion'], ['cat-home.jpg', 'Home & Living'], ['cat-beauty.jpg', 'Beauty & Health'],
      ['cat-sports.jpg', 'Sports & Outdoors'], ['cat-toys.jpg', 'Toys & Games'], ['cat-jewelry.jpg', 'Jewelry & Accessories'], ['cat-tools.jpg', 'Tools & Hardware'],
      ['cat-pets.jpg', 'Pet Supplies'], ['cat-auto.jpg', 'Automotive'],
    ].map(([f, label]) => ({ image: img(f), label, href: `page:shop?category=${encodeURIComponent(label)}` })),
  }, { paddingTop: 14, paddingBottom: 14, columns: 10, responsive: { tablet: { columns: 5 }, mobile: { columns: 3 } } });

  const featured = section(ids, 'product-grid', {
    eyebrow: '',
    title: 'Featured Products',
    headingStyle: 'plain',
    tabs: [
      { label: 'All Products', filter: 'featured' },
      { label: 'New Arrivals', filter: 'new' },
      { label: 'Best Sellers', filter: 'bestseller' },
      { label: 'On Sale', filter: 'sale' },
    ],
    filter: 'featured',
    limit: 6,
    showRatings: true,
    showWishlist: true,
    buttonLabel: 'Add to Cart',
  }, { paddingTop: 24, paddingBottom: 56, columns: 6, responsive: { tablet: { columns: 3 }, mobile: { columns: 2 } } }, 'retail');

  const home = page(ids, {
    title: 'Home', slug: 'home', isHomepage: true,
    seoDescription: 'Shop the latest electronics, fashion, home and beauty products with fast shipping.',
    sections: [
      section(ids, 'hero', {
        title: 'Shop the Latest',
        titleAccent: 'Retail',
        titleAccentPrefix: 'in ',
        accentStyle: 'italic-color',
        accentInline: false,
        tagline: 'Electronics • Fashion • Home • Beauty • More',
        badges: [{ icon: 'Truck', text: 'Fast Shipping' }, { icon: 'ShieldCheck', text: 'Secure Payment' }, { icon: 'Repeat', text: 'Easy Returns' }],
        buttons: [{ label: 'Shop Now', href: 'page:shop', icon: 'ArrowRight', iconRight: true, style: 'primary' }],
        image: img('hero.jpg'),
        images: [img('hero.jpg')],
        showArrows: true,
      }, { minHeight: 320, background: '#0B3A8F', textColor: '#FFFFFF', paddingTop: 0, paddingBottom: 0, responsive: { mobile: { minHeight: 0 } } }, 'retail'),
      tiles,
      featured,
      section(ids, 'promo-banner', {
        image: img('p-shoes.jpg'),
        scriptTitle: 'Limited Time',
        title: 'Up to 25% Off Deals & Offers',
        text: 'Save on electronics, kitchen and fashion favorites. While supplies last.',
        price: '',
        button: { label: 'Shop Deals', href: 'page:shop?tag=sale', icon: 'ArrowRight' },
      }, { background: '#0B53DB', textColor: '#FFFFFF', paddingTop: 0, paddingBottom: 0 }, 'split-soft'),
      section(ids, 'features-strip', {
        dividers: true,
        items: [
          { icon: 'Truck', title: 'Free Shipping', text: 'On orders over $50' },
          { icon: 'Store', title: 'Local Pickup', text: 'Pick up in store for free' },
          { icon: 'Repeat', title: 'Easy Returns', text: '30-day return policy' },
          { icon: 'ShieldCheck', title: 'Secure Payment', text: 'Protected checkout' },
        ],
      }, { background: '#EDF3FC', paddingTop: 24, paddingBottom: 24, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }, 'strip'),
      section(ids, 'newsletter', { title: 'Get Exclusive Deals', text: 'Subscribe for new arrivals, offers and coupons.', buttonLabel: 'Subscribe', placeholder: 'Enter your email' }, { background: '#0A3A9A', textColor: '#FFFFFF', paddingTop: 48, paddingBottom: 48 }),
    ],
  }, 0);

  const shop = page(ids, {
    title: 'Shop', slug: 'shop',
    sections: [
      section(ids, 'text-block', { eyebrow: '', title: 'Shop All Products', body: 'Search, filter and sort our full catalog.', headingStyle: 'plain', buttons: [] }, { paddingTop: 40, paddingBottom: 8, align: 'left' }),
      section(ids, 'product-catalog', { showSearch: true, showCategories: true, showSort: true, showAddToCart: true, layout: 'grid', filterTag: '', showRatings: true, showWishlist: true }, { paddingTop: 8, paddingBottom: 80, columns: 4, responsive: { tablet: { columns: 3 }, mobile: { columns: 2 } } }, 'retail'),
    ],
  }, 1);

  const cats = page(ids, {
    title: 'Categories', slug: 'categories', showInNav: false,
    sections: [
      section(ids, 'text-block', { title: 'Shop by Category', body: '', headingStyle: 'plain', buttons: [] }, { paddingTop: 40, paddingBottom: 8, align: 'left' }),
      { ...tiles, id: ids.next('s') },
    ],
  }, 2);

  const about = page(ids, {
    title: 'About', slug: 'about', showInNav: false,
    sections: [
      section(ids, 'text-block', { eyebrow: 'About Us', title: 'Everything You Need, Delivered', body: 'Fockis Retail Store brings you trusted brands across electronics, fashion, home, beauty and more — with fast shipping, local pickup and easy 30-day returns.', headingStyle: 'plain', buttons: [] }, { paddingTop: 64, paddingBottom: 32 }),
      section(ids, 'faq', { title: 'Shipping & Returns', items: [
        { q: 'How much is shipping?', a: 'Shipping is free on orders over $50. Otherwise a flat rate applies at checkout.' },
        { q: 'Can I pick up my order?', a: 'Yes — choose Local Pickup at checkout and we will email you when it is ready.' },
        { q: 'What is your return policy?', a: 'Return unused items within 30 days for a full refund.' },
        { q: 'How do I track my order?', a: 'Open My Account to see your orders and their status.' },
      ] }, { paddingTop: 16, paddingBottom: 72 }),
    ],
  }, 3);

  const contact = page(ids, { title: 'Contact', slug: 'contact', sections: [contactSection(ids, 'Customer Support', 'Questions about an order, a return or a product? We reply within 24 hours.')] }, 4);
  const stores = page(ids, { title: 'Stores', slug: 'stores', showInNav: false, sections: [
    section(ids, 'hours', { title: 'Visit Our Store', text: 'Shop in person or pick up online orders.', showAddress: true, showPhone: true }, { paddingTop: 56, paddingBottom: 40 }),
    mapSection(ids),
  ] }, 5);

  return {
    slug: 'fockis-retail-store',
    name: 'Fockis Retail Store',
    description: 'Blue and white ecommerce design with utility bar, search, category navigation, featured products, ratings and discounts.',
    categorySlugs: ['general-retail', 'electronics', 'fashion', 'clothing', 'furniture', 'beauty-products', 'jewelry', 'grocery', 'pet-supplies', 'bookstores', 'automotive-parts', 'hardware', 'gift-shops'],
    isDefaultFor: ['general-retail', 'electronics', 'fashion', 'clothing', 'furniture', 'beauty-products', 'jewelry', 'grocery', 'pet-supplies', 'bookstores', 'automotive-parts', 'hardware', 'gift-shops'],
    isFeatured: true,
    accessLevel: 'free',
    thumbnail: img('preview.jpg'),
    previewImages: [img('preview.jpg')],
    tags: ['official', 'retail', 'ecommerce'],
    content: content({
      theme, header, footer,
      navigation: nav(ids, [['Home', 'page:home'], ['New Arrivals', 'page:shop?tag=new'], ['Best Sellers', 'page:shop?tag=bestseller'], ['Deals & Offers', 'page:shop?tag=sale'], ['Brands', 'page:shop'], ['Stores', 'page:stores'], ['Contact', 'page:contact']]),
      pages: [home, shop, cats, about, contact, stores, cartPage(ids, 6), accountPage(ids, 7)],
      settings: defaultSettings({
        businessName: 'Fockis Retail Store', tagline: 'Shop the latest in retail', logoIcon: 'ShoppingBag',
        phone: '(614) 555-0199', email: 'support@fockisretail.com', address: '500 Commerce Ave, Columbus, OH 43215',
        hours: [{ label: 'Mon – Sat', value: '9:00 AM – 9:00 PM' }, { label: 'Sunday', value: '10:00 AM – 6:00 PM' }],
        features: { cart: true, booking: false, reservations: false, customCakes: false, delivery: false, pickup: true, shipping: true, wishlist: true, accounts: true },
        shipping: { flatRate: 7.99, freeOver: 50, deliveryFee: 0, taxRate: 0 },
        seo: { siteTitle: 'Fockis Retail Store — Shop the Latest in Retail', description: 'Electronics, fashion, home, beauty and more with fast shipping, secure payment and easy returns.', ogImage: img('preview.jpg'), allowIndexing: true },
      }),
      products,
      productCategories: categories,
      reviews: [
        { id: 'rv1', productId: 'rt-laptop', name: 'Chris P.', rating: 5, text: 'Fast and the screen is gorgeous.' },
        { id: 'rv2', productId: 'rt-headphones', name: 'Nadia L.', rating: 4, text: 'Great sound for the price.' },
      ],
    }),
  };
}

/* ============================================================================
 * 4. FOCKIS BEAUTY & HAIR STUDIO
 * ========================================================================== */
export function fockisBeautyStudio(): TemplateDefinition {
  const ids = new IdFactory('bt');
  const img = (f: string) => A('beauty', f);
  const theme = {
    skin: 'beauty',
    colors: {
      primary: '#7B1FA2',
      primaryText: '#FFFFFF',
      secondary: '#5A1675',
      accent: '#E2B04A',
      background: '#FFFFFF',
      surface: '#F7F1FA',
      text: '#2A1B33',
      heading: '#24102F',
      muted: '#5F5068',
      border: '#E9DDF0',
      headerBg: '#FFFFFF',
      headerText: '#24102F',
      topBarBg: '#5E1880',
      topBarText: '#FFFFFF',
      footerBg: '#24102F',
      footerText: '#EADCF2',
    },
    fonts: { heading: 'Playfair Display', body: 'Nunito Sans', script: 'Kaushan Script', nav: 'Nunito Sans' },
    radius: 12,
    buttonShape: 'rounded' as const,
    maxWidth: 1480,
  };

  const services = [
    service('bt-styling', 'Hair Styling', 65, 60, 'Hair', img('svc-styling.jpg'), 'Blowouts, silk press, curls and updos for every occasion.', 'Scissors'),
    service('bt-braids', 'Braids & Protective Styles', 150, 240, 'Hair', img('svc-braids.jpg'), 'Knotless, box braids, cornrows, twists and more.', 'Waves'),
    service('bt-extensions', 'Hair Extensions', 220, 180, 'Hair', img('svc-extensions.jpg'), 'Sew-ins, tape-ins and wig installs with premium hair.', 'Sparkles'),
    service('bt-makeup', 'Makeup Services', 85, 60, 'Beauty', img('svc-makeup.jpg'), 'Soft glam, bridal and special-event makeup.', 'Brush'),
    service('bt-nails', 'Nail Care', 45, 60, 'Nails', img('svc-nails.jpg'), 'Manicures, gel, acrylic sets and nail art.', 'Hand'),
    service('bt-facials', 'Facials & Skin Care', 95, 75, 'Skin', img('svc-facials.jpg'), 'Hydrating facials, peels and personalized skincare.', 'Flower2'),
  ];
  const staffMembers = [
    staff('bt-st1', 'Jasmine Carter', 'Master Stylist', 'Silk press and color specialist with 12 years of experience.', ['bt-styling', 'bt-extensions']),
    staff('bt-st2', 'Amara Okafor', 'Braid Artist', 'Known for flawless knotless braids and creative protective styles.', ['bt-braids']),
    staff('bt-st3', 'Bianca Lopez', 'Makeup Artist', 'Bridal and editorial makeup artist.', ['bt-makeup']),
    staff('bt-st4', 'Kim Nguyen', 'Nail & Skin Specialist', 'Licensed esthetician and nail technician.', ['bt-nails', 'bt-facials']),
  ];
  const products = [
    product('bt-shampoo', 'Fockis Repair Shampoo', 24, 'Hair Care', img('products.jpg'), { featured: true, description: 'Sulfate-free shampoo for strong, shiny hair.' }),
    product('bt-conditioner', 'Deep Moisture Conditioner', 26, 'Hair Care', img('products.jpg'), { featured: true, description: 'Rich conditioner for curls and coils.' }),
    product('bt-oil', 'Growth Hair Oil', 22, 'Hair Care', img('products.jpg'), { featured: true, tags: ['bestseller'], description: 'Lightweight oil blend for scalp and ends.' }),
    product('bt-serum', 'Glow Face Serum', 38, 'Skin Care', img('svc-facials.jpg'), { featured: true, description: 'Vitamin C serum for radiant skin.' }),
  ];

  const header = section(ids, 'header', {
    layout: 'standard',
    logoStyle: 'beauty',
    logoText: 'Fockis',
    logoSubtext: 'Beauty & Hair Studio',
    logoIcon: 'Sparkles',
    showTopBar: true,
    topBarLeft: [{ icon: 'MapPin', text: '123 Main St, Columbus, OH 43215' }, { icon: 'Phone', text: '(614) 555-0199' }, { icon: 'Clock', text: 'Mon – Sat: 9:00 AM – 7:00 PM' }],
    topBarRight: [],
    showSocialInTopBar: true,
    socialLabel: 'Follow Us',
    showSearch: true,
    showAccount: true,
    showCart: true,
    cta: { label: 'Book Appointment', href: 'page:book', icon: 'CalendarDays' },
    sticky: true,
  }, {}, 'beauty');

  const footer = section(ids, 'footer', {
    about: 'Professional hair, beauty and wellness services for every style and every occasion.',
    columns: [
      { title: 'Studio', links: [['About Us', 'page:about'], ['Services', 'page:services'], ['Pricing', 'page:pricing'], ['Gallery', 'page:gallery']] },
      { title: 'Book & Shop', links: [['Book Appointment', 'page:book'], ['Shop', 'page:shop'], ['Contact', 'page:contact'], ['My Account', 'page:account']] },
    ],
    showHours: true, showContact: true, showSocial: true,
    copyright: '© {year} Fockis Beauty & Hair Studio. All rights reserved.',
  }, {}, 'beauty');

  const serviceCards = section(ids, 'category-cards', {
    eyebrow: 'OUR SERVICES',
    title: 'Beauty & Hair Services',
    headingStyle: 'lines',
    items: services.map((s) => ({ image: s.image, label: s.name, icon: s.icon, href: 'page:services' })),
  }, { paddingTop: 24, paddingBottom: 32, columns: 6, responsive: { tablet: { columns: 3 }, mobile: { columns: 2 } } }, 'caption-bar');

  const home = page(ids, {
    title: 'Home', slug: 'home', isHomepage: true,
    seoDescription: 'Professional hair, beauty & wellness services for every style, every occasion.',
    sections: [
      section(ids, 'hero', {
        eyebrowStyle: 'text-lines',
        eyebrow: 'BEAUTY & HAIR STUDIO',
        title: 'Look Good',
        titleAccent: 'Feel Confident',
        accentStyle: 'script',
        accentInline: false,
        subtitle: 'Professional Hair, Beauty & Wellness Services for Every Style, Every Occasion.',
        contentAlign: 'left',
        buttons: [
          { label: 'Book Appointment', href: 'page:book', icon: 'CalendarDays', style: 'primary' },
          { label: 'Shop Hair & Beauty', href: 'page:shop', icon: 'ShoppingBag', style: 'outline-light' },
        ],
        image: img('hero.jpg'),
        images: [img('hero.jpg')],
        showArrows: true,
      }, { minHeight: 374, background: '#2A0F38', textColor: '#FFFFFF', paddingTop: 0, paddingBottom: 0, responsive: { mobile: { minHeight: 0 } } }, 'overlay'),
      section(ids, 'features-strip', {
        dividers: true,
        items: [
          { icon: 'CalendarDays', title: 'Easy Online Booking', text: 'Schedule your service anytime' },
          { icon: 'Users', title: 'Professional Stylists', text: 'Experienced & certified team' },
          { icon: 'Gem', title: 'Premium Products', text: 'Top-quality hair & beauty brands' },
          { icon: 'ShieldCheck', title: 'Clean & Safe Studio', text: 'Hygienic and comfortable environment' },
        ],
      }, { background: '#FFFFFF', paddingTop: 18, paddingBottom: 18, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }, 'strip'),
      serviceCards,
      section(ids, 'promo-banner', {
        image: img('products.jpg'),
        scriptTitle: '',
        titleParts: ['Shop Our', 'Beauty Essentials'],
        title: 'Shop Our Beauty Essentials',
        text: 'Hair care, skin care, and salon-quality beauty products.',
        price: '',
        button: { label: 'Shop Now', href: 'page:shop', icon: 'ShoppingCart' },
      }, { background: '#3B0F52', textColor: '#FFFFFF', paddingTop: 0, paddingBottom: 0 }, 'split-gold'),
      section(ids, 'team', { eyebrow: 'OUR TEAM', title: 'Meet Our Stylists', showBook: true }, { paddingTop: 72, paddingBottom: 72, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }),
      section(ids, 'testimonials', {
        eyebrow: 'REVIEWS', title: 'What Our Clients Say',
        items: [
          { quote: 'My knotless braids were perfect and lasted for weeks!', name: 'Tiana B.', rating: 5 },
          { quote: 'Booking online was easy and the studio is so clean and beautiful.', name: 'Monique S.', rating: 5 },
          { quote: 'Bianca did my bridal makeup — I felt amazing all day.', name: 'Elena R.', rating: 5 },
        ],
      }, { background: '#F7F1FA', paddingTop: 72, paddingBottom: 72, columns: 3, responsive: { mobile: { columns: 1 } } }),
    ],
  }, 0);

  const about = page(ids, {
    title: 'About Us', slug: 'about',
    sections: [
      heading(ids, 'ABOUT US', 'Beauty Is Our Passion'),
      section(ids, 'image-text', { title: 'A Studio Built for You', body: 'Fockis Beauty & Hair Studio is a full-service salon offering hair styling, protective styles, extensions, makeup, nails and skincare. Our certified team uses premium products in a clean, welcoming space.', image: img('hero.jpg'), imageSide: 'right', buttons: [{ label: 'Book Appointment', href: 'page:book', icon: 'CalendarDays', style: 'primary' }] }, { paddingTop: 16, paddingBottom: 64 }),
      section(ids, 'team', { eyebrow: 'OUR TEAM', title: 'Meet Our Team', showBook: true }, { background: '#F7F1FA', paddingTop: 64, paddingBottom: 72, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }),
    ],
  }, 1);

  const servicesPage = page(ids, {
    title: 'Services', slug: 'services',
    sections: [
      heading(ids, 'OUR SERVICES', 'Services & Prices', 'Choose a service and book online in seconds.'),
      section(ids, 'services-list', { showPrice: true, showDuration: true, showBook: true, bookHref: 'page:book' }, { paddingTop: 16, paddingBottom: 80, columns: 3, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }),
    ],
  }, 2);

  const gallery = galleryPage(ids, 3, services.map((s) => s.image).concat([img('hero.jpg'), img('products.jpg')]));

  const pricing = page(ids, {
    title: 'Pricing', slug: 'pricing',
    sections: [
      heading(ids, 'PRICING', 'Beauty Packages'),
      section(ids, 'pricing-table', { plans: [
        { name: 'Glow Up', price: '$95', period: 'per visit', features: ['Silk press or blowout', 'Deep conditioning', 'Trim'], button: { label: 'Book Now', href: 'page:book' }, highlighted: false },
        { name: 'Bridal Beauty', price: '$249', period: 'package', features: ['Bridal hair styling', 'Full glam makeup', 'Lashes included', 'Trial session'], button: { label: 'Book Now', href: 'page:book' }, highlighted: true },
        { name: 'Pamper Day', price: '$179', period: 'package', features: ['Signature facial', 'Gel manicure', 'Blowout'], button: { label: 'Book Now', href: 'page:book' }, highlighted: false },
      ] }, { paddingTop: 16, paddingBottom: 80, columns: 3, responsive: { mobile: { columns: 1 } } }),
    ],
  }, 4);

  const shop = page(ids, {
    title: 'Shop', slug: 'shop',
    sections: [
      heading(ids, 'SHOP', 'Beauty Essentials', 'Salon-quality products delivered to your door or ready for pickup.'),
      section(ids, 'product-catalog', { showSearch: false, showCategories: true, showSort: true, showAddToCart: true, layout: 'grid', filterTag: '' }, { paddingTop: 16, paddingBottom: 80, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }, 'soft'),
    ],
  }, 5);

  const contact = page(ids, { title: 'Contact', slug: 'contact', sections: [contactSection(ids, 'Contact the Studio', 'Questions about services or availability? Send us a message.'), mapSection(ids)] }, 6);

  const book = page(ids, {
    title: 'Book Appointment', slug: 'book', showInNav: false,
    sections: [
      heading(ids, 'BOOK ONLINE', 'Book Your Appointment', 'Pick a service, stylist, date and time. You will receive a booking confirmation instantly.'),
      section(ids, 'booking-form', { title: 'Book Appointment', submitLabel: 'Confirm Booking', allowStaffChoice: true }, { paddingTop: 16, paddingBottom: 80 }),
    ],
  }, 7);

  return {
    slug: 'fockis-beauty-hair-studio',
    name: 'Fockis Beauty & Hair Studio',
    description: 'Elegant purple, gold and white salon design with appointment booking, service menu, team profiles and beauty shop.',
    categorySlugs: ['beauty-studio', 'hair-salon', 'nail-salon', 'spa', 'makeup-artist', 'skincare', 'wellness'],
    isDefaultFor: ['beauty-studio', 'hair-salon', 'nail-salon', 'spa', 'makeup-artist', 'skincare', 'wellness'],
    isFeatured: true,
    accessLevel: 'free',
    thumbnail: img('preview.jpg'),
    previewImages: [img('preview.jpg')],
    tags: ['official', 'beauty', 'booking', 'salon'],
    content: content({
      theme, header, footer,
      navigation: nav(ids, [['Home', 'page:home'], ['About Us', 'page:about'], ['Services', 'page:services'], ['Gallery', 'page:gallery'], ['Pricing', 'page:pricing'], ['Shop', 'page:shop'], ['Contact', 'page:contact']]),
      pages: [home, about, servicesPage, gallery, pricing, shop, contact, book, cartPage(ids, 8), accountPage(ids, 9)],
      settings: defaultSettings({
        businessName: 'Fockis Beauty & Hair Studio', tagline: 'Look Good, Feel Confident', logoIcon: 'Sparkles',
        phone: '(614) 555-0199', email: 'book@fockisbeauty.com', address: '123 Main St, Columbus, OH 43215',
        hours: [{ label: 'Mon – Sat', value: '9:00 AM – 7:00 PM' }, { label: 'Sunday', value: 'Closed' }],
        features: { cart: true, booking: true, reservations: false, customCakes: false, delivery: false, pickup: true, shipping: true, wishlist: false, accounts: true },
        booking: { openTime: '09:00', closeTime: '19:00', daysOpen: [1, 2, 3, 4, 5, 6], slotMinutes: 30, maxPartySize: 1 },
        seo: { siteTitle: 'Fockis Beauty & Hair Studio — Look Good, Feel Confident', description: 'Hair styling, braids, extensions, makeup, nails and facials. Book your appointment online.', ogImage: img('preview.jpg'), allowIndexing: true },
      }),
      services, staffMembers, products,
      productCategories: ['Hair Care', 'Skin Care'],
    }),
  };
}

/* ============================================================================
 * 5. FOCKIS BARBERSHOP
 * ========================================================================== */
export function fockisBarbershop(): TemplateDefinition {
  const ids = new IdFactory('bb');
  const img = (f: string) => A('barber', f);
  const theme = {
    skin: 'barber',
    colors: {
      primary: '#E9B54A',
      primaryText: '#111111',
      secondary: '#1E5AA8',
      accent: '#E9B54A',
      background: '#0B0B0B',
      surface: '#151515',
      text: '#F2F2F2',
      heading: '#FFFFFF',
      muted: '#B9B9B9',
      border: '#2A2A2A',
      headerBg: '#0B0B0B',
      headerText: '#FFFFFF',
      topBarBg: '#0B0B0B',
      topBarText: '#FFFFFF',
      footerBg: '#050505',
      footerText: '#D9D9D9',
    },
    fonts: { heading: 'Playfair Display', body: 'Nunito Sans', script: 'Kaushan Script', nav: 'Nunito Sans' },
    radius: 12,
    buttonShape: 'rounded' as const,
    maxWidth: 1480,
  };

  const services = [
    service('bb-haircut', 'Haircut', 30, 45, 'Cuts', img('svc-haircut.jpg'), 'Classic cuts, fades and tapers finished with a line-up.', 'Scissors'),
    service('bb-beard', 'Beard Grooming', 20, 30, 'Beard', img('svc-beard.jpg'), 'Beard shaping, line-up and conditioning oil.', 'Smile'),
    service('bb-kids', 'Kids Haircut', 22, 30, 'Cuts', img('svc-kids.jpg'), 'Patient, friendly cuts for boys 12 and under.', 'Baby'),
    service('bb-design', 'Hair Design', 15, 20, 'Add-ons', img('svc-design.jpg'), 'Custom parts, patterns and freestyle designs.', 'PenTool'),
    service('bb-towel', 'Hot Towel Shave', 35, 40, 'Shave', img('svc-towel.jpg'), 'Straight-razor shave with hot towels and aftershave.', 'Bath'),
    service('bb-braids', 'Braids & Styles', 60, 90, 'Styles', img('svc-braids.jpg'), 'Cornrows, twists and protective styles.', 'Waves'),
  ];
  const staffMembers = [
    staff('bb-st1', 'Marcus "Fade King" Hill', 'Master Barber', 'Fades, tapers and razor work for 15 years.', ['bb-haircut', 'bb-towel', 'bb-design']),
    staff('bb-st2', 'Andre Wallace', 'Senior Barber', 'Beard sculpting and classic cuts.', ['bb-haircut', 'bb-beard']),
    staff('bb-st3', 'Jay Morales', 'Barber & Stylist', 'Braids, twists and creative designs.', ['bb-braids', 'bb-design', 'bb-kids']),
  ];

  const header = section(ids, 'header', {
    layout: 'standard',
    logoStyle: 'barber',
    logoText: 'Fockis',
    logoSubtext: 'Barbershop',
    logoIcon: 'BarberPole',
    showTopBar: true,
    topBarLeft: [{ icon: 'MapPin', text: '456 Main St, Columbus, OH 43215' }, { icon: 'Phone', text: '(614) 555-0246' }, { icon: 'Clock', text: 'Mon – Sat: 9:00 AM – 7:00 PM' }, { icon: '', text: 'Sun: 11:00 AM – 5:00 PM' }],
    topBarRight: [],
    showSocialInTopBar: true,
    socialLabel: 'Follow Us',
    showSearch: true,
    showAccount: true,
    showCart: true,
    cta: { label: 'Book Appointment', href: 'page:booking', icon: 'CalendarDays' },
    sticky: true,
  }, {}, 'barber');

  const footer = section(ids, 'footer', {
    about: 'Professional haircuts, beard grooming, and modern styles for men and boys.',
    columns: [
      { title: 'Barbershop', links: [['About Us', 'page:about'], ['Services', 'page:services'], ['Our Barbers', 'page:barbers'], ['Gallery', 'page:gallery']] },
      { title: 'Visit', links: [['Book Appointment', 'page:booking'], ['Pricing', 'page:pricing'], ['Contact', 'page:contact'], ['My Bookings', 'page:account']] },
    ],
    showHours: true, showContact: true, showSocial: true,
    copyright: '© {year} Fockis Barbershop. All rights reserved.',
  }, {}, 'barber');

  const cards = section(ids, 'category-cards', {
    eyebrow: '',
    title: 'Our Services',
    headingStyle: 'side-lines',
    items: services.map((s) => ({ image: s.image, label: s.name, icon: s.icon, href: 'page:services' })),
  }, { background: '#0B0B0B', paddingTop: 12, paddingBottom: 24, columns: 6, responsive: { tablet: { columns: 3 }, mobile: { columns: 2 } } }, 'caption-bar');

  const home = page(ids, {
    title: 'Home', slug: 'home', isHomepage: true,
    seoDescription: 'Professional haircuts, beard grooming, and modern styles for men and boys.',
    sections: [
      section(ids, 'hero', {
        eyebrowStyle: 'text-lines',
        eyebrow: 'PREMIUM BARBERSHOP',
        title: 'Fockis',
        titleAccent: 'Barbershop',
        accentStyle: 'script',
        accentInline: false,
        decorBelowTitle: 'Scissors',
        subtitle: 'Professional Haircuts, Beard Grooming, and Modern Styles for Men and Boys.',
        contentAlign: 'center',
        buttons: [
          { label: 'Book Appointment', href: 'page:booking', icon: 'CalendarDays', style: 'primary' },
          { label: 'Our Services', href: 'page:services', icon: 'ShoppingBag', style: 'outline-light' },
        ],
        image: img('hero.jpg'),
        images: [img('hero.jpg')],
      }, { minHeight: 380, background: '#0B0B0B', textColor: '#FFFFFF', paddingTop: 0, paddingBottom: 0, responsive: { mobile: { minHeight: 0 } } }, 'overlay'),
      section(ids, 'features-strip', {
        dividers: true,
        items: [
          { icon: 'CalendarDays', title: 'Easy Online Booking', text: 'Schedule your haircut anytime' },
          { icon: 'Users', title: 'Experienced Barbers', text: 'Skilled & professional team' },
          { icon: 'Gem', title: 'Modern & Classic Styles', text: 'Fades, tapers, beard care & more' },
          { icon: 'Armchair', title: 'Clean & Comfortable', text: 'A safe and welcoming environment' },
        ],
        iconColor: '#111111',
      }, { background: '#FFFFFF', textColor: '#111111', paddingTop: 20, paddingBottom: 20, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }, 'strip'),
      cards,
      section(ids, 'promo-banner', {
        image: img('walkin.jpg'),
        scriptTitle: '',
        title: 'Walk-In Welcome!',
        text: 'Book Online or Stop By Today.',
        price: '',
        button: { label: 'Book Now', href: 'page:booking', icon: 'CalendarDays' },
      }, { background: '#0B0B0B', textColor: '#FFFFFF', paddingTop: 0, paddingBottom: 0 }, 'walkin'),
      section(ids, 'team', { eyebrow: 'OUR BARBERS', title: 'Meet the Team', showBook: true }, { background: '#111111', paddingTop: 72, paddingBottom: 72, columns: 3, responsive: { mobile: { columns: 1 } } }),
      section(ids, 'hours', { title: 'Business Hours', text: 'Walk-ins welcome all day. Book online to skip the wait.', showAddress: true, showPhone: true }, { background: '#0B0B0B', paddingTop: 56, paddingBottom: 56 }),
    ],
  }, 0);

  const about = page(ids, {
    title: 'About Us', slug: 'about',
    sections: [
      heading(ids, 'ABOUT US', 'More Than a Haircut', '', { background: '#0B0B0B' }),
      section(ids, 'image-text', { title: 'Our Shop', body: 'Fockis Barbershop is a premium shop for men and boys. We combine classic barbering with modern styles in a clean, comfortable space.', image: img('hero.jpg'), imageSide: 'left', buttons: [{ label: 'Book Appointment', href: 'page:booking', icon: 'CalendarDays', style: 'primary' }] }, { background: '#0B0B0B', paddingTop: 16, paddingBottom: 72 }),
    ],
  }, 1);

  const servicesPage = page(ids, {
    title: 'Services', slug: 'services',
    sections: [
      heading(ids, 'SERVICES', 'Services & Prices', 'Every cut includes a hot towel finish.', { background: '#0B0B0B' }),
      section(ids, 'services-list', { showPrice: true, showDuration: true, showBook: true, bookHref: 'page:booking' }, { background: '#0B0B0B', paddingTop: 16, paddingBottom: 80, columns: 3, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }),
    ],
  }, 2);

  const barbers = page(ids, {
    title: 'Our Barbers', slug: 'barbers',
    sections: [
      section(ids, 'team', { eyebrow: 'OUR BARBERS', title: 'Meet the Barbers', showBook: true }, { background: '#0B0B0B', paddingTop: 72, paddingBottom: 80, columns: 3, responsive: { mobile: { columns: 1 } } }),
    ],
  }, 3);

  const gallery = galleryPage(ids, 4, services.map((s) => s.image).concat([img('hero.jpg'), img('walkin.jpg')]), 'Gallery', { background: '#0B0B0B' });

  const pricing = page(ids, {
    title: 'Pricing', slug: 'pricing',
    sections: [
      heading(ids, 'PRICING', 'Barber Packages', '', { background: '#0B0B0B' }),
      section(ids, 'pricing-table', { plans: [
        { name: 'The Classic', price: '$30', period: 'per visit', features: ['Haircut', 'Line-up', 'Hot towel finish'], button: { label: 'Book Now', href: 'page:booking' }, highlighted: false },
        { name: 'The Works', price: '$65', period: 'per visit', features: ['Haircut', 'Beard grooming', 'Hot towel shave', 'Hair design'], button: { label: 'Book Now', href: 'page:booking' }, highlighted: true },
        { name: 'Father & Son', price: '$48', period: 'per visit', features: ['Adult haircut', 'Kids haircut', 'Line-ups'], button: { label: 'Book Now', href: 'page:booking' }, highlighted: false },
      ] }, { background: '#0B0B0B', paddingTop: 16, paddingBottom: 80, columns: 3, responsive: { mobile: { columns: 1 } } }),
    ],
  }, 5);

  const contact = page(ids, { title: 'Contact', slug: 'contact', sections: [contactSection(ids, 'Contact the Shop', 'Questions or group bookings? Send us a message.', { background: '#0B0B0B' }), mapSection(ids)] }, 6);

  const booking = page(ids, {
    title: 'Booking', slug: 'booking', showInNav: false,
    sections: [
      heading(ids, 'BOOK ONLINE', 'Book Your Appointment', 'Choose your barber, service, date and time. Walk-ins are always welcome.', { background: '#0B0B0B' }),
      section(ids, 'booking-form', { title: 'Book Appointment', submitLabel: 'Confirm Booking', allowStaffChoice: true }, { background: '#0B0B0B', paddingTop: 16, paddingBottom: 80 }),
    ],
  }, 7);

  return {
    slug: 'fockis-barbershop',
    name: 'Fockis Barbershop',
    description: 'Black and gold barbershop design with barber profiles, service prices, online booking and walk-in promotion.',
    categorySlugs: ['barbershop'],
    isDefaultFor: ['barbershop'],
    isFeatured: true,
    accessLevel: 'free',
    thumbnail: img('preview.jpg'),
    previewImages: [img('preview.jpg')],
    tags: ['official', 'barbershop', 'booking'],
    content: content({
      theme, header, footer,
      navigation: nav(ids, [['Home', 'page:home'], ['About Us', 'page:about'], ['Services', 'page:services'], ['Our Barbers', 'page:barbers'], ['Gallery', 'page:gallery'], ['Pricing', 'page:pricing'], ['Contact', 'page:contact']]),
      pages: [home, about, servicesPage, barbers, gallery, pricing, contact, booking, cartPage(ids, 8, { background: '#0B0B0B' }), accountPage(ids, 9, { background: '#0B0B0B' })],
      settings: defaultSettings({
        businessName: 'Fockis Barbershop', tagline: 'Premium Barbershop', logoIcon: 'Scissors',
        phone: '(614) 555-0246', email: 'book@fockisbarbershop.com', address: '456 Main St, Columbus, OH 43215',
        hours: [{ label: 'Mon – Sat', value: '9:00 AM – 7:00 PM' }, { label: 'Sunday', value: '11:00 AM – 5:00 PM' }],
        features: { cart: false, booking: true, reservations: false, customCakes: false, delivery: false, pickup: false, shipping: false, wishlist: false, accounts: true },
        booking: { openTime: '09:00', closeTime: '19:00', daysOpen: [0, 1, 2, 3, 4, 5, 6], slotMinutes: 15, maxPartySize: 1 },
        seo: { siteTitle: 'Fockis Barbershop — Premium Haircuts & Grooming', description: 'Haircuts, fades, beard grooming, kids cuts, hair designs and hot towel shaves. Book online or walk in.', ogImage: img('preview.jpg'), allowIndexing: true },
      }),
      services, staffMembers,
    }),
  };
}

/* ============================================================================
 * UNIVERSAL BUSINESS TEMPLATE — used for categories without an industry design
 * ========================================================================== */
export function fockisBusiness(): TemplateDefinition {
  const ids = new IdFactory('bz');
  const theme = {
    skin: 'modern',
    colors: {
      primary: '#1D4ED8', primaryText: '#FFFFFF', secondary: '#0F172A', accent: '#F59E0B',
      background: '#FFFFFF', surface: '#F1F5F9', text: '#1E293B', heading: '#0F172A', muted: '#64748B', border: '#E2E8F0',
      headerBg: '#FFFFFF', headerText: '#0F172A', topBarBg: '#0F172A', topBarText: '#FFFFFF', footerBg: '#0F172A', footerText: '#CBD5E1',
    },
    fonts: { heading: 'Outfit', body: 'Inter', script: 'Outfit', nav: 'Inter' },
    radius: 12,
    buttonShape: 'rounded' as const,
    maxWidth: 1240,
  };
  const header = section(ids, 'header', { layout: 'standard', logoStyle: 'simple', logoText: 'Your Business', logoSubtext: '', logoIcon: 'Building2', showTopBar: false, topBarLeft: [], topBarRight: [], showSearch: false, showAccount: false, showCart: false, cta: { label: 'Contact Us', href: 'page:contact', icon: 'MessageCircle' }, sticky: true }, {}, 'simple');
  const footer = section(ids, 'footer', { about: 'Professional services you can trust.', columns: [{ title: 'Company', links: [['About', 'page:about'], ['Services', 'page:services'], ['Contact', 'page:contact']] }], showHours: true, showContact: true, showSocial: true, copyright: '© {year} Your Business. All rights reserved.' }, {}, 'simple');
  const home = page(ids, {
    title: 'Home', slug: 'home', isHomepage: true,
    sections: [
      section(ids, 'hero', { eyebrowStyle: 'text-lines', eyebrow: 'WELCOME', title: 'Professional Solutions', titleAccent: 'For Your Success', accentStyle: 'italic-color', accentInline: false, subtitle: 'We help businesses, organizations and families achieve more with trusted expertise and personal service.', contentAlign: 'left', buttons: [{ label: 'Get Started', href: 'page:contact', icon: 'ArrowRight', iconRight: true, style: 'primary' }, { label: 'Our Services', href: 'page:services', icon: '', style: 'outline' }], image: '', images: [] }, { minHeight: 480, background: 'linear-gradient(135deg,#EFF6FF 0%,#FFFFFF 60%)', paddingTop: 0, paddingBottom: 0 }, 'split'),
      section(ids, 'features-strip', { dividers: false, items: [
        { icon: 'Award', title: 'Experienced', text: 'Years of proven results' },
        { icon: 'Users', title: 'People First', text: 'Personal, attentive service' },
        { icon: 'ShieldCheck', title: 'Trusted', text: 'Licensed and insured' },
        { icon: 'Clock', title: 'On Time', text: 'Reliable every time' },
      ] }, { background: '#FFFFFF', paddingTop: 40, paddingBottom: 40, columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }, 'cards'),
      section(ids, 'services-list', { eyebrow: 'WHAT WE DO', title: 'Our Services', showPrice: false, showDuration: false, showBook: false, bookHref: 'page:contact' }, { background: '#F8FAFC', paddingTop: 72, paddingBottom: 72, columns: 3, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }),
      section(ids, 'stats', { items: [{ value: '10+', label: 'Years' }, { value: '500+', label: 'Clients' }, { value: '98%', label: 'Satisfaction' }, { value: '24/7', label: 'Support' }] }, { background: '#0F172A', textColor: '#FFFFFF', paddingTop: 56, paddingBottom: 56, columns: 4, responsive: { mobile: { columns: 2 } } }),
      section(ids, 'testimonials', { eyebrow: 'TESTIMONIALS', title: 'What People Say', items: [
        { quote: 'Professional, responsive and truly invested in our success.', name: 'Client A.', rating: 5 },
        { quote: 'They made the whole process simple and stress-free.', name: 'Client B.', rating: 5 },
        { quote: 'Highly recommended to anyone looking for quality.', name: 'Client C.', rating: 5 },
      ] }, { paddingTop: 72, paddingBottom: 72, columns: 3, responsive: { mobile: { columns: 1 } } }),
      section(ids, 'newsletter', { title: 'Stay in Touch', text: 'Get news and updates in your inbox.', buttonLabel: 'Subscribe', placeholder: 'Your email' }, { background: '#EFF6FF', paddingTop: 48, paddingBottom: 48 }),
    ],
  }, 0);
  const about = page(ids, { title: 'About', slug: 'about', sections: [heading(ids, 'ABOUT', 'Who We Are', 'Our mission, our values and the team behind our work.'), section(ids, 'team', { eyebrow: '', title: 'Our Team', showBook: false }, { paddingTop: 24, paddingBottom: 72, columns: 3, responsive: { mobile: { columns: 1 } } })] }, 1);
  const servicesPage = page(ids, { title: 'Services', slug: 'services', sections: [heading(ids, 'SERVICES', 'How We Can Help'), section(ids, 'services-list', { showPrice: true, showDuration: false, showBook: false, bookHref: 'page:contact' }, { paddingTop: 16, paddingBottom: 72, columns: 3, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } }), section(ids, 'faq', { title: 'Frequently Asked Questions', items: [{ q: 'How do I get started?', a: 'Send us a message using the contact form and we will reply within one business day.' }, { q: 'Where are you located?', a: 'See our address on the contact page.' }] }, { paddingTop: 16, paddingBottom: 72 })] }, 2);
  const contact = page(ids, { title: 'Contact', slug: 'contact', sections: [contactSection(ids, 'Contact Us', 'Tell us how we can help.'), mapSection(ids)] }, 3);
  return {
    slug: 'fockis-business',
    name: 'Fockis Professional',
    description: 'Clean, modern multi-purpose design for any business, organization or personal brand.',
    categorySlugs: [],
    isDefaultFor: [],
    isFeatured: false,
    accessLevel: 'free',
    thumbnail: '',
    previewImages: [],
    tags: ['official', 'universal'],
    content: content({
      theme, header, footer,
      navigation: nav(ids, [['Home', 'page:home'], ['About', 'page:about'], ['Services', 'page:services'], ['Contact', 'page:contact']]),
      pages: [home, about, servicesPage, contact],
      settings: defaultSettings({ businessName: 'Your Business', logoIcon: 'Building2' }),
      services: [
        service('bz-s1', 'Consultation', 0, 60, 'Services', '', 'A one-on-one session to understand your goals.', 'MessageCircle'),
        service('bz-s2', 'Planning', 0, 60, 'Services', '', 'A clear plan with milestones and outcomes.', 'ClipboardList'),
        service('bz-s3', 'Support', 0, 60, 'Services', '', 'Ongoing help whenever you need it.', 'LifeBuoy'),
      ],
      staffMembers: [staff('bz-t1', 'Alex Morgan', 'Founder', 'Leads every project personally.'), staff('bz-t2', 'Sam Lee', 'Manager', 'Keeps everything on track.'), staff('bz-t3', 'Jordan Diaz', 'Specialist', 'Expert in client success.')],
    }),
  };
}

/* ============================================================================
 * BLANK — "Start from scratch"
 * ========================================================================== */
export function blankTemplate(): TemplateDefinition {
  const base = fockisBusiness();
  const ids = new IdFactory('bl');
  const c = base.content;
  c.pages = [page(ids, { title: 'Home', slug: 'home', isHomepage: true, sections: [
    section(ids, 'text-block', { eyebrow: '', title: 'Start Building Your Website', body: 'Click any text to edit it, or add sections from the left panel.', headingStyle: 'plain', buttons: [] }, { paddingTop: 120, paddingBottom: 120, align: 'center' }),
  ] }, 0)];
  c.navigation = nav(ids, [['Home', 'page:home']]);
  c.catalog = { products: [], productCategories: [], services: [], staff: [], reviews: [] };
  c.header.props.cta = null;
  c.footer.props.columns = [];
  return { ...base, slug: 'blank', name: 'Blank Website', description: 'Start from scratch with an empty page.', tags: ['blank'], content: c };
}

export const OFFICIAL_TEMPLATE_FACTORIES = [
  sweetCrumbsBakery,
  fockisRestaurant,
  fockisRetailStore,
  fockisBeautyStudio,
  fockisBarbershop,
  fockisBusiness,
  blankTemplate,
];
