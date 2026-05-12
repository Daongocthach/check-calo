export const HEALTH_INFORMATION_SOURCE_SECTIONS = [
  {
    key: 'bmi',
    references: [
      {
        key: 'cdc',
        titleKey: 'healthInformationSourcesScreen.sections.bmi.references.cdc.title',
        citationKey: 'healthInformationSourcesScreen.sections.bmi.references.cdc.citation',
        url: 'https://www.cdc.gov/growth-chart-training/hcp/using-bmi/calculating-bmi.html',
      },
    ],
  },
  {
    key: 'bmr',
    references: [
      {
        key: 'mifflin',
        titleKey: 'healthInformationSourcesScreen.sections.bmr.references.mifflin.title',
        citationKey: 'healthInformationSourcesScreen.sections.bmr.references.mifflin.citation',
        url: 'https://doi.org/10.1093/ajcn/51.2.241',
      },
      {
        key: 'roza',
        titleKey: 'healthInformationSourcesScreen.sections.bmr.references.roza.title',
        citationKey: 'healthInformationSourcesScreen.sections.bmr.references.roza.citation',
        url: 'https://pubmed.ncbi.nlm.nih.gov/6741850/',
      },
    ],
  },
  {
    key: 'activity',
    references: [
      {
        key: 'brooks',
        titleKey: 'healthInformationSourcesScreen.sections.activity.references.brooks.title',
        citationKey: 'healthInformationSourcesScreen.sections.activity.references.brooks.citation',
        url: 'https://doi.org/10.1093/ajcn/79.5.921S',
      },
      {
        key: 'iom',
        titleKey: 'healthInformationSourcesScreen.sections.activity.references.iom.title',
        citationKey: 'healthInformationSourcesScreen.sections.activity.references.iom.citation',
        url: 'https://nap.nationalacademies.org/catalog/10490/dietary-reference-intakes-for-energy-carbohydrate-fiber-fat-fatty-acids-cholesterol-protein-and-amino-acids',
      },
    ],
  },
  {
    key: 'macros',
    references: [
      {
        key: 'dietaryGuidelines',
        titleKey:
          'healthInformationSourcesScreen.sections.macros.references.dietaryGuidelines.title',
        citationKey:
          'healthInformationSourcesScreen.sections.macros.references.dietaryGuidelines.citation',
        url: 'https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf',
      },
      {
        key: 'who',
        titleKey: 'healthInformationSourcesScreen.sections.macros.references.who.title',
        citationKey: 'healthInformationSourcesScreen.sections.macros.references.who.citation',
        url: 'https://www.who.int/publications/i/item/924120916X',
      },
    ],
  },
  {
    key: 'weightManagement',
    references: [
      {
        key: 'wadden',
        titleKey:
          'healthInformationSourcesScreen.sections.weightManagement.references.wadden.title',
        citationKey:
          'healthInformationSourcesScreen.sections.weightManagement.references.wadden.citation',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22392863/',
      },
      {
        key: 'hall',
        titleKey: 'healthInformationSourcesScreen.sections.weightManagement.references.hall.title',
        citationKey:
          'healthInformationSourcesScreen.sections.weightManagement.references.hall.citation',
        url: 'https://doi.org/10.3945/ajcn.112.036350',
      },
    ],
  },
] as const;

export const BMI_PROFILE_SOURCE_LINKS = [
  {
    key: 'bmi',
    url: 'https://www.cdc.gov/growth-chart-training/hcp/using-bmi/calculating-bmi.html',
  },
  {
    key: 'energy',
    url: 'https://doi.org/10.1093/ajcn/51.2.241',
  },
  {
    key: 'macros',
    url: 'https://nap.nationalacademies.org/catalog/10490/dietary-reference-intakes-for-energy-carbohydrate-fiber-fat-fatty-acids-cholesterol-protein-and-amino-acids',
  },
  {
    key: 'weightChange',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17848938/',
  },
] as const;
