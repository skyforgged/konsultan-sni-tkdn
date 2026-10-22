import ContentCard from './shared/ContentCard.astro';
import FaqBlock from './shared/FaqBlock.astro';
import CtaBlock from './shared/CtaBlock.astro';
import TableBlock from './shared/TableBlock.astro';
import NoteBlock from './shared/NoteBlock.astro';
import StepsBlock from './shared/StepsBlock.astro';
import StatsBlock from './shared/StatsBlock.astro';
import GlossaryBlock from './shared/GlossaryBlock.astro';
import QuoteBlock from './shared/QuoteBlock.astro';
import ArticleSectionBlock from './shared/ArticleSectionBlock.astro';
import ProcessTimeline from './shared/ProcessTimeline.astro';
import ChecklistCard from './shared/ChecklistCard.astro';
import ComparisonTable from './shared/ComparisonTable.astro';
import DocumentList from './shared/DocumentList.astro';
import ImagePanel from './shared/ImagePanel.astro';
import FeatureCardGrid from './shared/FeatureCardGrid.astro';
import StatsGrid from './shared/StatsGrid.astro';
import SourceLinks from './shared/SourceLinks.astro';
import ContactPanel from './shared/ContactPanel.astro';
import PageHeaderBlock from './shared/PageHeaderBlock.astro';
import HomeHeroBlock from './shared/HomeHeroBlock.astro';
import ServiceListBlock from './shared/ServiceListBlock.astro';
import HomeProcessBlock from './shared/HomeProcessBlock.astro';
import ArticleListBlock from './shared/ArticleListBlock.astro';
import HomeCtaBlock from './shared/HomeCtaBlock.astro';
import NotFoundBlock from './shared/NotFoundBlock.astro';

const blocks: Record<string, any> = {
  card: ContentCard,
  faq: FaqBlock,
  cta: CtaBlock,
  table: TableBlock,
  note: NoteBlock,
  steps: StepsBlock,
  stats: StatsBlock,
  glossary: GlossaryBlock,
  quote: QuoteBlock,
  section: ArticleSectionBlock,
  'process-timeline': ProcessTimeline,
  'checklist-card': ChecklistCard,
  'comparison-table': ComparisonTable,
  'document-list': DocumentList,
  'image-panel': ImagePanel,
  'feature-card-grid': FeatureCardGrid,
  'stats-grid': StatsGrid,
  'source-links': SourceLinks,
  'contact-panel': ContactPanel,
  'page-header': PageHeaderBlock,
  'home-hero': HomeHeroBlock,
  'service-list': ServiceListBlock,
  'home-process': HomeProcessBlock,
  'article-list': ArticleListBlock,
  'home-cta': HomeCtaBlock,
  'not-found': NotFoundBlock,
};
export default blocks;
