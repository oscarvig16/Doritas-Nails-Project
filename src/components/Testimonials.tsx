import React from 'react';
import { Star } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface Testimonial {
  content: string;
  author: string;
}

export const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      content: "Woow. Speechless. Excellent job. I love my nails, second time I go and I am delighted. Undoubtedly, I recommend them. Good treatment... Good job... and above all I am satisfied, thank you very much. Dorita and Jaz. They make a good team. May God fill them with blessings.",
      author: "Maribel Ramirez"
    },
    {
      content: "I've been going for a couple of years, I will never change her for any other, my nails always pretty, she uses the best products and she does the best designs!!! The best ethics on her shop and treats you like a queen. There's water, coffee and even snacks. Good music, environment and very clean. I will always recommend her for her experience, the techniques and her beautiful attitude.",
      author: "Erika Vivanco"
    },
    {
      content: "Great customer service and specially the quality of Dorita's work! It's hard to find your nail person. Definitely recommend her! My nails were sculped!",
      author: "Kristel A."
    },
    {
      content: "Dorita's Nails has become my forever nail shop. They are attentive and courteous. The work is excellent. They are prompt. The shop is clean. She is generous with her products. My nails are gorgeous. I have not experienced any broken or cracked nails. Dorita is the consummate professional. She goes above and beyond including cuticle treatment.",
      author: "Felecia Garret"
    },
    {
      content: "Very clean and pleasant salon. Dorita the owner is such a beautiful person and makes you feel so welcomed and comfortable. Just found my new nail salon. Give them a visit you won't regret it.",
      author: "Flor Marquez"
    },
    {
      content: "This salon truly stands out! The standards here are high. Always clean, always professional, the ambience is very relaxing and I can guarantee that you will never be disappointed with any service offered here.",
      author: "Claudia Barajas"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-blush via-white to-primary/20">
      <div className="container">
        <h2 className="text-4xl md:text-5xl font-playfair font-semibold text-center text-gray-900 mb-16">
          Dream Nails, Real Stories: Discover what set us apart through our client's eyes
        </h2>

        <div className="relative px-4 md:px-10">
          <Swiper
            modules={[Autoplay, Navigation, Pagination]}
            spaceBetween={30}
            slidesPerView={1}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            navigation
            pagination={{ clickable: true }}
            breakpoints={{
              768: {
                slidesPerView: 2,
              },
              1024: {
                slidesPerView: 3,
              },
            }}
            className="testimonials-swiper !pb-14"
          >
            {testimonials.map((testimonial, index) => (
              <SwiperSlide key={index}>
                <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <blockquote className="flex-grow">
                    <p className="text-gray-700 italic leading-relaxed mb-4">
                      "{testimonial.content}"
                    </p>
                  </blockquote>
                  <footer>
                    <p className="text-primary font-playfair font-bold italic">
                      {testimonial.author}
                    </p>
                  </footer>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};