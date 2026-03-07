export interface Disease {
  id: number;
  name: string;
  crop: string;
  symptoms: string;
  causes: string;
  organic_treatment: string;
  chemical_treatment: string;
}

const DISEASES: Disease[] = [
  {
    id: 1,
    name: 'Maize Lethal Necrosis (MLN)',
    crop: 'Maize',
    symptoms: 'Yellowing of leaves, stunted growth, dead heart, failure to produce ears.',
    causes: 'Combination of Maize Chlorotic Mottle Virus and Sugarcane Mosaic Virus.',
    organic_treatment: 'Crop rotation, use of certified seeds, early planting.',
    chemical_treatment: 'Control vectors like aphids and thrips using systemic insecticides.'
  },
  {
    id: 2,
    name: 'Cassava Mosaic Disease (CMD)',
    crop: 'Cassava',
    symptoms: 'Mosaic patterns on leaves, leaf distortion, reduced leaf size, stunted growth.',
    causes: 'Cassava Mosaic Geminiviruses transmitted by whiteflies.',
    organic_treatment: 'Use resistant varieties, rogue infected plants, use clean cuttings.',
    chemical_treatment: 'No direct chemical control for the virus; control whiteflies with insecticides if necessary.'
  },
  {
    id: 3,
    name: 'Black Pod Disease',
    crop: 'Cocoa',
    symptoms: 'Small brown spots on pods that expand rapidly, white fungal growth in humid conditions.',
    causes: 'Phytophthora palmivora (fungus-like organism).',
    organic_treatment: 'Pruning for better aeration, frequent harvesting, removing infected pods.',
    chemical_treatment: 'Copper-based fungicides applied during the rainy season.'
  },
  {
    id: 4,
    name: 'Coffee Berry Disease (CBD)',
    crop: 'Coffee',
    symptoms: 'Dark, sunken spots on green berries, causing them to drop or dry up.',
    causes: 'Colletotrichum kahawae (fungus).',
    organic_treatment: 'Pruning, planting resistant varieties (e.g., Ruiru 11).',
    chemical_treatment: 'Preventive fungicide sprays (copper or systemic) during flowering and berry expansion.'
  },
  {
    id: 5,
    name: 'Late Blight',
    crop: 'Potato/Tomato',
    symptoms: 'Water-soaked spots on leaves, white mold on underside, rapid rotting of tubers/fruit.',
    causes: 'Phytophthora infestans.',
    organic_treatment: 'Crop rotation, removing volunteer plants, using healthy seeds.',
    chemical_treatment: 'Fungicides containing mancozeb or copper-based compounds.'
  },
  {
    id: 6,
    name: 'Banana Xanthomonas Wilt (BXW)',
    crop: 'Banana',
    symptoms: 'Yellowing and wilting of leaves, premature ripening of fruit, yellow bacterial ooze when cut.',
    causes: 'Xanthomonas vasicola pv. musacearum (bacteria).',
    organic_treatment: 'Sterilizing tools with fire or bleach, removing male buds, uprooting infected mats.',
    chemical_treatment: 'No effective chemical treatment; focus on prevention and sanitation.'
  },
  {
    id: 7,
    name: 'Rice Blast',
    crop: 'Rice',
    symptoms: 'Eye-shaped lesions on leaves with gray centers, rotting of the neck (neck blast).',
    causes: 'Magnaporthe oryzae (fungus).',
    organic_treatment: 'Using resistant varieties, balanced nitrogen fertilization, water management.',
    chemical_treatment: 'Fungicides like tricyclazole or azoxystrobin.'
  },
  {
    id: 8,
    name: 'Groundnut Rosette Disease',
    crop: 'Groundnut',
    symptoms: 'Stunted growth, yellowing or mottling of leaves, distorted leaves.',
    causes: 'Groundnut Rosette Virus transmitted by aphids.',
    organic_treatment: 'Early planting, close spacing to cover ground, resistant varieties.',
    chemical_treatment: 'Control aphid vectors with insecticides.'
  },
  {
    id: 9,
    name: 'Tomato Leaf Curl',
    crop: 'Tomato',
    symptoms: 'Upward curling of leaves, yellowing of leaf margins, stunted growth, reduced fruiting.',
    causes: 'Tomato Yellow Leaf Curl Virus (TYLCV) transmitted by whiteflies.',
    organic_treatment: 'Using insect nets, weeding, resistant varieties.',
    chemical_treatment: 'Control whiteflies using neem oil or synthetic insecticides like imidacloprid.'
  }
];

class DiseaseDatabase {
  search(query: string): Disease[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return DISEASES.filter(d => 
      d.name.toLowerCase().includes(lowerQuery) || 
      d.crop.toLowerCase().includes(lowerQuery) || 
      d.symptoms.toLowerCase().includes(lowerQuery)
    );
  }

  getAll(): Disease[] {
    return DISEASES;
  }
}

export const diseaseDb = new DiseaseDatabase();
