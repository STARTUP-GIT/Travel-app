/**
 * Fallback tourism gallery used ONLY when the admin has not configured any
 * landing slideshow images yet (app_config.imageBanners is empty) or every
 * configured image fails to load. Real destination photographs, one entry
 * per famous Indian place. Once the admin adds images through the backend
 * configuration, this list is never used.
 */
export type LandingSlide = {
  src: string;
  alt: string;
  position?: string;
};

export const FALLBACK_LANDING_SLIDES: LandingSlide[] = [
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Mysore_Palace_Morning.jpg/1920px-Mysore_Palace_Morning.jpg",
    alt: "Mysuru Palace, Karnataka",
    position: "center 45%",
  },
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Complex_of_Virupaksha_Temple%2C_Hampi_%2804%29.jpg/1920px-Complex_of_Virupaksha_Temple%2C_Hampi_%2804%29.jpg",
    alt: "Virupaksha Temple, Hampi",
    position: "center 40%",
  },
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Jog_Falls_05092016.jpg/1920px-Jog_Falls_05092016.jpg",
    alt: "Jog Falls, Karnataka",
    position: "center 55%",
  },
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Abbey_Falls_New.jpg/1920px-Abbey_Falls_New.jpg",
    alt: "Abbey Falls, Coorg",
    position: "center 60%",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Bangalore_Mysore_Maharaja_Palace.jpg",
    alt: "Bengaluru Palace, Karnataka",
    position: "center 45%",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Delight_india.jpg",
    alt: "Gokarna Beach, Karnataka",
    position: "center 55%",
  },
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Kumarkom.jpg/1920px-Kumarkom.jpg",
    alt: "Kerala Backwaters, Kumarakom",
    position: "center 45%",
  },
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Palolem_Beach%2C_South_Goa.jpg/1920px-Palolem_Beach%2C_South_Goa.jpg",
    alt: "Palolem Beach, Goa",
    position: "center 55%",
  },
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/1920px-Taj_Mahal_%28Edited%29.jpeg",
    alt: "Taj Mahal, Agra",
    position: "center 45%",
  },
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/20191219_Fort_Amber%2C_Amer%2C_Jaipur_0955_9481.jpg/1920px-20191219_Fort_Amber%2C_Amer%2C_Jaipur_0955_9481.jpg",
    alt: "Amber Fort, Jaipur",
    position: "center 45%",
  },
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1920px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg",
    alt: "Meenakshi Temple, Madurai",
    position: "center 45%",
  },
];