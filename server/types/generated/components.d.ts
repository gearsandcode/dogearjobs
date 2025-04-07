import type { Schema, Struct } from '@strapi/strapi';

export interface SearchTermSets extends Struct.ComponentSchema {
  collectionName: 'components_search_term_sets';
  info: {
    description: '';
    displayName: 'Term sets';
    icon: 'brush';
  };
  attributes: {
    operator: Schema.Attribute.Enumeration<['None', 'OR', 'AND']> &
      Schema.Attribute.DefaultTo<'None'>;
    term_set: Schema.Attribute.Component<'search.terms', true>;
  };
}

export interface SearchTerms extends Struct.ComponentSchema {
  collectionName: 'components_search_terms';
  info: {
    description: '';
    displayName: 'Terms';
    icon: 'apps';
  };
  attributes: {
    negative: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    operator: Schema.Attribute.Enumeration<['None', 'OR', 'AND']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'None'>;
    term: Schema.Attribute.Relation<'oneToOne', 'api::term.term'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'search.term-sets': SearchTermSets;
      'search.terms': SearchTerms;
    }
  }
}
