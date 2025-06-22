import React from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Service {
  title: string;
  category: string;
  subcategory: string;
  duration: string;
  price: string | number;
  description: string;
}

export const ManicureServices: React.FC = () => {
  const services: Service[] = [
    // Square Size
    {
      title: "Short Square (S)",
      category: "Manicure",
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 50,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "Medium Square (M)",
      category: "Manicure",
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 55,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "Large Square (L)",
      category: "Manicure",
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 60,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "XL Square",
      category: "Manicure",
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 65,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "2XL Square",
      category: "Manicure",
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 70,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "3XL Square",
      category: "Manicure",
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 75,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "Glamorous Square",
      category: "Manicure",
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 80,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    // Color Acrylic
    {
      title: "Short Color Acrylic",
      category: "Manicure",
      subcategory: "Color Acrylic",
      duration: "1h 20min",
      price: 45,
      description: "Short color acrylic set for a clean, minimal look. Includes gel top coat."
    },
    {
      title: "Medium Color Acrylic",
      category: "Manicure",
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 50,
      description: "Balanced length with bold color. Includes gel top coat."
    },
    {
      title: "Large Color Acrylic",
      category: "Manicure",
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 55,
      description: "More dramatic length for standout styles. Includes gel top coat."
    },
    {
      title: "XL Color Acrylic",
      category: "Manicure",
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 60,
      description: "Extra length for extended elegance. Includes gel top coat."
    },
    {
      title: "2XL Color Acrylic",
      category: "Manicure",
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 65,
      description: "Statement length with full color finish. Includes gel top coat."
    },
    {
      title: "3XL Color Acrylic",
      category: "Manicure",
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 70,
      description: "High glam look with extra length. Includes gel top coat."
    },
    {
      title: "Glamorous Color Acrylic",
      category: "Manicure",
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 75,
      description: "Maximum length and style. Includes gel top coat."
    },
    // Sculpted Acrylic
    {
      title: "Short Sculpted",
      category: "Manicure",
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 58,
      description: "Hand-sculpted acrylic without tips for short length. Includes gel top coat."
    },
    {
      title: "Medium Sculpted",
      category: "Manicure",
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 63,
      description: "Sculpted set with medium length. Sleek and natural. Includes gel top coat."
    },
    {
      title: "Large Sculpted",
      category: "Manicure",
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 68,
      description: "Sculpted acrylic for bold, long looks. Includes gel top coat."
    },
    {
      title: "XL Sculpted",
      category: "Manicure",
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 73,
      description: "Long sculpted nails for elegance and drama. Includes gel top coat."
    },
    {
      title: "2XL Sculpted",
      category: "Manicure",
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 78,
      description: "Extra long sculpted set for glamorous impact. Includes gel top coat."
    },
    {
      title: "3XL Sculpted",
      category: "Manicure",
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 83,
      description: "High fashion sculpted nails. Designed for runway or everyday glam. Includes gel top coat."
    },
    {
      title: "Glamorous Sculpted",
      category: "Manicure",
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 88,
      description: "Our most luxurious sculpted set. Maximum length, maximum shine. Includes gel top coat."
    },
    // Fills
    {
      title: "Acrylic Fill (2 weeks)",
      category: "Manicure",
      subcategory: "Fills",
      duration: "1h 25min",
      price: 40,
      description: "Recommended for clients returning within 2 weeks of previous service. Helps maintain shape and strength."
    },
    {
      title: "Acrylic Fill (3 weeks)",
      category: "Manicure",
      subcategory: "Fills",
      duration: "1h 25min",
      price: 45,
      description: "Ideal for clients returning after 3 weeks. Includes more reshaping and acrylic build-up."
    },
    {
      title: "Acrylic Fill (4 weeks)",
      category: "Manicure",
      subcategory: "Fills",
      duration: "1h 30min",
      price: 50,
      description: "Best for long regrowth. Includes shaping, restructuring, and fresh acrylic application."
    },
    // Removals
    {
      title: "Removal (Our Work)",
      category: "Manicure",
      subcategory: "Removals",
      duration: "30 min",
      price: 15,
      description: "Gentle removal of our own product using professional techniques to preserve nail health."
    },
    {
      title: "Removal (Other Work)",
      category: "Manicure",
      subcategory: "Removals",
      duration: "30 min",
      price: 20,
      description: "Removal of product from other salons. May require more time depending on material."
    },
    // Add-ons
    {
      title: "Almond Shape",
      category: "Manicure",
      subcategory: "Add-ons",
      duration: "15 min",
      price: 7,
      description: "A soft, tapered nail shape for a natural and elegant look. Add-on to any set."
    },
    {
      title: "French Tip",
      category: "Manicure",
      subcategory: "Add-ons",
      duration: "20 min",
      price: 8,
      description: "Classic and clean. Adds a white tip over your acrylic or gel base."
    },
    {
      title: "Cut-Down",
      category: "Manicure",
      subcategory: "Add-ons",
      duration: "5 min",
      price: 5,
      description: "Shortens the length of your existing nails while maintaining shape."
    },
    // Main Services
    {
      title: "Gel Manicure",
      category: "Manicure",
      subcategory: "Main Services",
      duration: "1h",
      price: 38,
      description: "Includes nail cut, cuticle care, short massage, and gel color of your choice."
    },
    {
      title: "Construction Gel",
      category: "Manicure",
      subcategory: "Main Services",
      duration: "10 min",
      price: 10,
      description: "Strengthens nails with a durable gel layer. Perfect for added longevity before polish."
    },
    {
      title: "Acrylic Over Natural Nail",
      category: "Manicure",
      subcategory: "Main Services",
      duration: "1h 10min",
      price: 40,
      description: "Protects and strengthens your natural nails while keeping a clean, polished finish."
    },
    // Designs
    {
      title: "2 Nails Design",
      category: "Manicure",
      subcategory: "Designs",
      duration: "15–20 min",
      price: "5 and up",
      description: "Select 2 designs from: Glitter, Basic Lines, Cat Eye, Stickers, or Foils."
    },
    {
      title: "10 Nails Design",
      category: "Manicure",
      subcategory: "Designs",
      duration: "25 min",
      price: "15–20",
      description: "Full set designs available with Glitter, Basic Lines, Cat Eye, Stickers, or Foils."
    },
    {
      title: "3D Flowers",
      category: "Manicure",
      subcategory: "Designs",
      duration: "20-30 min",
      price: "8-30",
      description: "Elegant floral accents raised from the nail for dimension and texture."
    },
    {
      title: "Encapsulated (2x)",
      category: "Manicure",
      subcategory: "Designs",
      duration: "10 min",
      price: 8,
      description: "Encased nail art between acrylic layers. Preserves shine and design on 2 nails."
    },
    {
      title: "Encapsulated (10x)",
      category: "Manicure",
      subcategory: "Designs",
      duration: "20 min",
      price: 25,
      description: "Full encapsulated design on every nail. Protected under crystal-clear acrylic."
    },
    {
      title: "Free-Hand Design (2x)",
      category: "Manicure",
      subcategory: "Designs",
      duration: "15 min",
      price: 7,
      description: "Custom designs on 2 nails drawn completely by hand. One-of-a-kind art."
    },
    {
      title: "Free-Hand Design (10x)",
      category: "Manicure",
      subcategory: "Designs",
      duration: "20 min",
      price: 25,
      description: "Every nail becomes a canvas. Intricate art drawn by our nail artists."
    },
    {
      title: "Acrylic Ombre",
      category: "Manicure",
      subcategory: "Designs",
      duration: "15-25 min",
      price: "4-8",
      description: "Create a seamless ombre fade. Choose 2 nails for subtle detail or upgrade to all 10."
    },
    {
      title: "Gel Blur",
      category: "Manicure",
      subcategory: "Designs",
      duration: "15-20 min",
      price: "3-7",
      description: "Dreamy blurred gel effect. Try it on 2 nails or elevate your full set."
    },
    {
      title: "Diamonds",
      category: "Manicure",
      subcategory: "Designs",
      duration: "15-30 min",
      price: "8-30",
      description: "Luxury crystal placement. Choose 2 accents or go full glam."
    },
    {
      title: "Matte Finish",
      category: "Manicure",
      subcategory: "Designs",
      duration: "10-20 min",
      price: "2-5",
      description: "Modern matte coating. Great for subtle or full-set looks."
    },
    {
      title: "Repairs (Per Nail)",
      category: "Manicure",
      subcategory: "Designs",
      duration: "10 min per nail",
      price: 5,
      description: "Repair cracked, chipped, or lifted nails. Priced per nail."
    },
    {
      title: "Gel Ombre",
      category: "Manicure",
      subcategory: "Designs",
      duration: "15-25 min",
      price: "4-8",
      description: "Soft gel-based ombre fade for a natural gradient look."
    }
  ];

  const categories = Array.from(new Set(services.map(service => service.subcategory)));

  return (
    <section className="min-h-screen bg-gradient-to-br from-blush/30 via-white to-secondary/20">
      <div className="container py-12 md:py-20">
        <Link 
          to="/" 
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>

        <div className="max-w-6xl mx-auto">
          <div className="relative text-center mb-16">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-secondary/20 rounded-full blur-2xl"></div>
            </div>
            <h1 className="relative text-4xl md:text-5xl font-playfair font-semibold text-gray-900 mb-4">
              Our Manicure Services
            </h1>
            <p className="relative text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              At Dorita's Nail Spa, we offer a wide variety of manicure services tailored to every style and preference. 
              From timeless natural looks to glamorous sculpted finishes, all of our services include nail and cuticle care 
              and are finished with a high-quality gel top coat.
            </p>
            <Link
              to="/book"
              className="relative inline-block px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl mt-8"
            >
              Book Your Service Now
            </Link>
          </div>

          <div className="relative w-full h-[300px] md:h-[400px] mb-16 rounded-2xl overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
            <img 
              src="https://images.pexels.com/photos/3997384/pexels-photo-3997384.jpeg"
              alt="Luxury manicure service" 
              className="w-full h-full object-cover"
            />
          </div>

          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-16">
              <h2 className="text-3xl font-playfair font-semibold text-gray-900 mb-8 pb-4 border-b border-gray-200">
                {category}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services
                  .filter(service => service.subcategory === category)
                  .map((service, index) => (
                    <div
                      key={index}
                      className="group bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-playfair font-semibold text-gray-900 group-hover:text-primary transition-colors">
                            {service.title}
                          </h3>
                          <span className="text-xl font-playfair font-semibold text-primary group-hover:scale-110 transition-transform">
                            ${service.price}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-gray-600">
                          <div className="flex items-center group-hover:text-primary/80 transition-colors">
                            <Clock className="w-4 h-4 mr-1" />
                            {service.duration}
                          </div>
                        </div>
                        
                        <div className="text-gray-700 border-t border-gray-100 pt-4 group-hover:border-primary/20 transition-colors">
                          <p>{service.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          <div className="relative mt-16 text-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-accent/10 rounded-full blur-3xl"></div>
            </div>
            <Link
              to="/book"
              className="relative inline-block px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Book Your Service Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};