export const HEALTH_INFORMATION_SOURCE_SECTIONS = [
  {
    key: 'bmi',
    references: [
      {
        key: 'cdc',
        titleKey: 'healthInformationSourcesScreen.sections.bmi.references.cdc.title',
        citationKey: 'healthInformationSourcesScreen.sections.bmi.references.cdc.citation',
        url: 'https://www.cdc.gov/bmi/adult-calculator/',
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
        url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
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
        url: 'https://pubmed.ncbi.nlm.nih.gov/15113740/',
      },
      {
        key: 'iom',
        titleKey: 'healthInformationSourcesScreen.sections.activity.references.iom.title',
        citationKey: 'healthInformationSourcesScreen.sections.activity.references.iom.citation',
        url: 'https://www.nationalacademies.org/read/10490',
      },
    ],
  },
  {
    key: 'macros',
    references: [
      {
        key: 'protein',
        titleKey: 'healthInformationSourcesScreen.sections.macros.references.protein.title',
        citationKey: 'healthInformationSourcesScreen.sections.macros.references.protein.citation',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28642676/',
      },
      {
        key: 'dietaryGuidelines',
        titleKey:
          'healthInformationSourcesScreen.sections.macros.references.dietaryGuidelines.title',
        citationKey:
          'healthInformationSourcesScreen.sections.macros.references.dietaryGuidelines.citation',
        url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines/current-dietary-guidelines',
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
    key: 'nutrients',
    references: [
      {
        key: 'fda',
        titleKey: 'healthInformationSourcesScreen.sections.nutrients.references.fda.title',
        citationKey: 'healthInformationSourcesScreen.sections.nutrients.references.fda.citation',
        url: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
      },
      {
        key: 'whoSugars',
        titleKey: 'healthInformationSourcesScreen.sections.nutrients.references.whoSugars.title',
        citationKey:
          'healthInformationSourcesScreen.sections.nutrients.references.whoSugars.citation',
        url: 'https://www.who.int/publications/i/item/9789241549028',
      },
      {
        key: 'whoFats',
        titleKey: 'healthInformationSourcesScreen.sections.nutrients.references.whoFats.title',
        citationKey:
          'healthInformationSourcesScreen.sections.nutrients.references.whoFats.citation',
        url: 'https://www.who.int/publications/i/item/9789240073630',
      },
    ],
  },
  {
    key: 'weightManagement',
    references: [
      {
        key: 'niddk',
        titleKey: 'healthInformationSourcesScreen.sections.weightManagement.references.niddk.title',
        citationKey:
          'healthInformationSourcesScreen.sections.weightManagement.references.niddk.citation',
        url: 'https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner',
      },
      {
        key: 'hallWeight',
        titleKey:
          'healthInformationSourcesScreen.sections.weightManagement.references.hallWeight.title',
        citationKey:
          'healthInformationSourcesScreen.sections.weightManagement.references.hallWeight.citation',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17848938/',
      },
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
        url: 'https://pubmed.ncbi.nlm.nih.gov/22434603/',
      },
    ],
  },
] as const;

export const BMI_PROFILE_SOURCE_LINKS = [
  {
    key: 'bmi',
    url: 'https://www.cdc.gov/bmi/adult-calculator/',
  },
  {
    key: 'energy',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
  },
  {
    key: 'macros',
    url: 'https://www.nationalacademies.org/read/10490',
  },
  {
    key: 'weightChange',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17848938/',
  },
] as const;
