export interface CuratedPlacePhoto {
  imageUrl: string
  sourceUrl: string
  author: string
  license: string
  licenseUrl: string
  exactVenue: boolean
}
/**
 * Six genuinely photographed, individually credited starter Places images.
 * Only Runyon Canyon is the actual listed location; all other photographs
 * illustrate the category, never claim to show the business.
 * A legitimate pet_places.photo_url takes priority over these examples.
 */
const file=(name:string) =>
  'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(name.replaceAll(' ','_'))
const entry=(filename:string,imageUrl:string,author:string,license:string,exactVenue=false):CuratedPlacePhoto=>({
  imageUrl,sourceUrl:file(filename),author,license,exactVenue,
  licenseUrl:license==='CC BY-SA 4.0'?'https://creativecommons.org/licenses/by-sa/4.0/':
    license==='CC BY-SA 3.0'?'https://creativecommons.org/licenses/by-sa/3.0/':
      license==='CC BY 4.0'?'https://creativecommons.org/licenses/by/4.0/':
        'https://creativecommons.org/licenses/by/2.0/',
})
const PHOTOS:Record<string,CuratedPlacePhoto>={
  'silver lake dog park':entry('Dog Park Fun - 15343944411.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Dog_Park_Fun_-_15343944411.jpg/500px-Dog_Park_Fun_-_15343944411.jpg',
    'Bob Haarmans','CC BY 2.0'),
  'runyon canyon park':entry('Runyon Canyon view to Downtown LA.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Runyon_Canyon_view_to_Downtown_LA.jpg/500px-Runyon_Canyon_view_to_Downtown_LA.jpg',
    'Peter Greenberg','CC BY-SA 4.0',true),
  'the morrison':entry('Hamburger with fries (36301680856).jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Hamburger_with_fries_%2836301680856%29.jpg/500px-Hamburger_with_fries_%2836301680856%29.jpg',
    'www.snack-nieuws.nl','CC BY 2.0'),
  'vca miller-robertson animal hospital':entry(
    'Close-up of a veterinarian examining a maltese dog with a stethoscope. (51687314898).jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Close-up_of_a_veterinarian_examining_a_maltese_dog_with_a_stethoscope._%2851687314898%29.jpg/500px-Close-up_of_a_veterinarian_examining_a_maltese_dog_with_a_stethoscope._%2851687314898%29.jpg',
    'Nenad Stojkovic','CC BY 2.0'),
  'groomickey salon & store':entry('Dog grooming.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Dog_grooming.JPG/500px-Dog_grooming.JPG',
    'Mickeysamuni','CC BY-SA 3.0'),
  'petco los angeles - dtla':entry(
    'Pet shop interior, Polmorla Walk, Wadebridge, Cornwall - August 2026.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Pet_shop_interior%2C_Polmorla_Walk%2C_Wadebridge%2C_Cornwall_-_August_2026.jpg/500px-Pet_shop_interior%2C_Polmorla_Walk%2C_Wadebridge%2C_Cornwall_-_August_2026.jpg',
    'Mutney','CC BY 4.0'),
}
export const CURATED_PLACE_NAMES=Object.freeze(Object.keys(PHOTOS))
export const getCuratedPlacePhoto=(name:string):CuratedPlacePhoto|null=>
  PHOTOS[name.normalize('NFC').trim().toLocaleLowerCase('en-US')]??null
