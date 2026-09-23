// Photographs for the sample listings, in a module of their own.
//
// This is deliberately NOT inside seedData.mjs. That script does its work at
// import time (a top-level await loop of addDoc calls), so any other file that
// imported a constant from it would silently seed a second copy of every
// listing. Keeping the data here means addPhotos.mjs can share it safely.
//
// IMPORTANT, and worth saying out loud before a defence: these are real
// photographs of real rooms, but they are STOCK PHOTOS from Unsplash. They are
// not pictures of actual boarding houses in Tagum City, and the four listings
// they belong to are invented sample data in the first place. Do not present
// them as surveyed properties.
//
// Each one was picked to match its listing's price and room type -- a bunk-bed
// dormitory for the ₱1,800 shared room, a plain single bedroom for the ₱2,500
// one, and so on. Images that looked like hotel suites were rejected, because a
// luxury interior on a ₱1,800 listing is its own kind of lie.

export const PHOTOS = {
  // Simple bedroom, bedside lamp -- ₱2,500 single.
  'Sunrise Boarding House':
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&q=80&auto=format&fit=crop',
  // Bunk beds in a shared dorm room -- ₱1,800 shared.
  'Greenview Dormitory':
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80&auto=format&fit=crop',
  // Studio with a kitchenette -- ₱3,200 "modern rooms near the city centre".
  'CityStay Rooms':
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&auto=format&fit=crop',
  // Lived-in common room with a bookshelf -- ₱2,100 "study-friendly".
  "Student's Nest":
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80&auto=format&fit=crop',
};
