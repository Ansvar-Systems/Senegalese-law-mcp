#!/usr/bin/env tsx
/**
 * Senegal Law MCP -- Curated Seed Generator
 *
 * Generates seed JSON files from curated law content for key Senegalese legislation.
 * Used when the government portal (jo.gouv.sn) is unreachable or content
 * is only available as PDF.
 *
 * This creates structured seed files with known provisions for the most
 * important laws, which are then built into the SQLite database by build-db.ts.
 *
 * Usage:
 *   npx tsx scripts/generate-seeds.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ParsedAct, ParsedProvision, ParsedDefinition } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_DIR = path.resolve(__dirname, '../data/seed');
const CENSUS_PATH = path.resolve(__dirname, '../data/census.json');

function titleToId(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

interface CuratedSeed {
  title: string;
  title_en: string;
  short_name: string;
  status: 'in_force' | 'amended' | 'repealed';
  issued_date: string;
  in_force_date: string;
  url: string;
  description: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

/* ================================================================
 * CURATED SEED DATA
 * ================================================================
 * Each law has its key provisions transcribed from official sources.
 * This is the fallback when the portal is unreachable.
 * ================================================================ */

const SEEDS: CuratedSeed[] = [
  // ---- DATA PROTECTION LAW 2008-12 ----
  {
    title: 'Loi n\u00b0 2008-12 du 25 janvier 2008 sur la Protection des donn\u00e9es \u00e0 caract\u00e8re personnel',
    title_en: 'Law No. 2008-12 of 25 January 2008 on the Protection of Personal Data',
    short_name: 'Loi 2008-12 (DPA)',
    status: 'in_force',
    issued_date: '2008-01-25',
    in_force_date: '2008-01-25',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Loi s\u00e9n\u00e9galaise sur la protection des donn\u00e9es \u00e0 caract\u00e8re personnel, cr\u00e9ant la Commission des Donn\u00e9es Personnelles (CDP)',
    provisions: [
      { provision_ref: 'art1', section: '1', title: 'Article premier - Objet', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "La pr\u00e9sente loi s'applique \u00e0 tout traitement de donn\u00e9es \u00e0 caract\u00e8re personnel effectu\u00e9 par une personne physique ou morale, de droit public ou de droit priv\u00e9, d\u00e8s lors que le responsable du traitement est \u00e9tabli sur le territoire du S\u00e9n\u00e9gal ou que le traitement, bien que le responsable ne soit pas \u00e9tabli sur le territoire du S\u00e9n\u00e9gal, porte sur des donn\u00e9es de personnes r\u00e9sidant au S\u00e9n\u00e9gal." },
      { provision_ref: 'art2', section: '2', title: 'Article 2 - D\u00e9finitions', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "Au sens de la pr\u00e9sente loi, on entend par : \u00ab donn\u00e9es \u00e0 caract\u00e8re personnel \u00bb : toute information relative \u00e0 une personne physique identifi\u00e9e ou identifiable directement ou indirectement, par r\u00e9f\u00e9rence \u00e0 un num\u00e9ro d'identification ou \u00e0 un ou plusieurs \u00e9l\u00e9ments propres \u00e0 son identit\u00e9 physique, physiologique, g\u00e9n\u00e9tique, psychique, culturelle, sociale ou \u00e9conomique ; \u00ab traitement de donn\u00e9es \u00e0 caract\u00e8re personnel \u00bb : toute op\u00e9ration ou ensemble d'op\u00e9rations portant sur de telles donn\u00e9es, quel que soit le proc\u00e9d\u00e9 utilis\u00e9 ; \u00ab responsable du traitement \u00bb : la personne physique ou morale, l'autorit\u00e9 publique, le service ou tout autre organisme qui, seul ou conjointement avec d'autres, d\u00e9termine les finalit\u00e9s et les moyens du traitement de donn\u00e9es \u00e0 caract\u00e8re personnel ; \u00ab sous-traitant \u00bb : toute personne physique ou morale, publique ou priv\u00e9e, qui traite des donn\u00e9es \u00e0 caract\u00e8re personnel pour le compte du responsable du traitement ; \u00ab personne concern\u00e9e \u00bb : toute personne physique qui fait l'objet d'un traitement de donn\u00e9es \u00e0 caract\u00e8re personnel." },
      { provision_ref: 'art4', section: '4', title: 'Article 4 - Principes de traitement', chapter: 'Titre 2 - Conditions de lic\u00e9it\u00e9 des traitements', content: "Les donn\u00e9es \u00e0 caract\u00e8re personnel doivent \u00eatre : collect\u00e9es pour des finalit\u00e9s d\u00e9termin\u00e9es, explicites et l\u00e9gitimes et ne pas \u00eatre trait\u00e9es ult\u00e9rieurement de mani\u00e8re incompatible avec ces finalit\u00e9s ; ad\u00e9quates, pertinentes et non excessives au regard des finalit\u00e9s pour lesquelles elles sont collect\u00e9es ; exactes, compl\u00e8tes et, si n\u00e9cessaire, mises \u00e0 jour ; conserv\u00e9es pendant une dur\u00e9e qui n'exc\u00e8de pas la dur\u00e9e n\u00e9cessaire aux finalit\u00e9s pour lesquelles elles sont collect\u00e9es et trait\u00e9es." },
      { provision_ref: 'art5', section: '5', title: 'Article 5 - Consentement', chapter: 'Titre 2 - Conditions de lic\u00e9it\u00e9 des traitements', content: "Le traitement des donn\u00e9es \u00e0 caract\u00e8re personnel n'est l\u00e9gitime que si la personne concern\u00e9e a donn\u00e9 son consentement, ou si le traitement est n\u00e9cessaire au respect d'une obligation l\u00e9gale, \u00e0 l'ex\u00e9cution d'une mission d'int\u00e9r\u00eat public, \u00e0 l'ex\u00e9cution d'un contrat, ou \u00e0 la r\u00e9alisation de l'int\u00e9r\u00eat l\u00e9gitime poursuivi par le responsable du traitement." },
      { provision_ref: 'art6', section: '6', title: 'Article 6 - Donn\u00e9es sensibles', chapter: 'Titre 2 - Conditions de lic\u00e9it\u00e9 des traitements', content: "Il est interdit de collecter ou de traiter des donn\u00e9es \u00e0 caract\u00e8re personnel qui r\u00e9v\u00e8lent l'origine raciale, ethnique, les opinions politiques, les convictions religieuses ou philosophiques, l'appartenance syndicale, la sant\u00e9 ou la vie sexuelle de la personne concern\u00e9e, sauf exceptions pr\u00e9vues par la loi." },
      { provision_ref: 'art8', section: '8', title: 'Article 8 - Droit d\'acc\u00e8s', chapter: 'Titre 3 - Droits de la personne concern\u00e9e', content: "Toute personne physique justifiant de son identit\u00e9 a le droit d'obtenir du responsable du traitement la confirmation que des donn\u00e9es \u00e0 caract\u00e8re personnel la concernant font ou ne font pas l'objet d'un traitement, ainsi que des informations relatives aux finalit\u00e9s du traitement, aux cat\u00e9gories de donn\u00e9es concern\u00e9es et aux destinataires." },
      { provision_ref: 'art9', section: '9', title: 'Article 9 - Droit de rectification', chapter: 'Titre 3 - Droits de la personne concern\u00e9e', content: "Toute personne physique justifiant de son identit\u00e9 peut exiger du responsable du traitement que soient, selon les cas, rectifi\u00e9es, compl\u00e9t\u00e9es, mises \u00e0 jour, verrouill\u00e9es ou effac\u00e9es les donn\u00e9es \u00e0 caract\u00e8re personnel la concernant, qui sont inexactes, incompl\u00e8tes, \u00e9quivoques, p\u00e9rim\u00e9es." },
      { provision_ref: 'art10', section: '10', title: 'Article 10 - Droit d\'opposition', chapter: 'Titre 3 - Droits de la personne concern\u00e9e', content: "Toute personne physique a le droit de s'opposer, pour des motifs l\u00e9gitimes, \u00e0 ce que des donn\u00e9es \u00e0 caract\u00e8re personnel la concernant fassent l'objet d'un traitement. Elle peut, sans avoir \u00e0 justifier d'un motif, s'opposer \u00e0 ce que les donn\u00e9es la concernant soient utilis\u00e9es \u00e0 des fins de prospection." },
      { provision_ref: 'art14', section: '14', title: 'Article 14 - S\u00e9curit\u00e9 des traitements', chapter: 'Titre 4 - Obligations du responsable du traitement', content: "Le responsable du traitement est tenu de prendre toute pr\u00e9caution utile, au regard de la nature des donn\u00e9es et des risques pr\u00e9sent\u00e9s par le traitement, pour pr\u00e9server la s\u00e9curit\u00e9 des donn\u00e9es et, notamment, emp\u00eacher qu'elles soient d\u00e9form\u00e9es, endommag\u00e9es, ou que des tiers non autoris\u00e9s y aient acc\u00e8s." },
      { provision_ref: 'art17', section: '17', title: 'Article 17 - Transferts internationaux', chapter: 'Titre 5 - Transfert de donn\u00e9es vers un pays tiers', content: "Le responsable d'un traitement ne peut transf\u00e9rer des donn\u00e9es \u00e0 caract\u00e8re personnel vers un \u00c9tat n'assurant pas un niveau de protection ad\u00e9quat. Le caract\u00e8re ad\u00e9quat du niveau de protection offert par un \u00c9tat s'appr\u00e9cie en fonction de la nature des donn\u00e9es, de la finalit\u00e9 du traitement, de la dur\u00e9e du traitement, des mesures de s\u00e9curit\u00e9 et de la l\u00e9gislation applicable dans l'\u00c9tat concern\u00e9." },
      { provision_ref: 'art20', section: '20', title: 'Article 20 - Commission des Donn\u00e9es Personnelles', chapter: 'Titre 6 - Commission des Donn\u00e9es Personnelles', content: "Il est cr\u00e9\u00e9 une autorit\u00e9 administrative ind\u00e9pendante d\u00e9nomm\u00e9e Commission des Donn\u00e9es Personnelles (CDP). La CDP est charg\u00e9e de veiller \u00e0 ce que les traitements de donn\u00e9es \u00e0 caract\u00e8re personnel soient mis en \u0153uvre conform\u00e9ment \u00e0 la pr\u00e9sente loi." },
      { provision_ref: 'art31', section: '31', title: 'Article 31 - Sanctions p\u00e9nales', chapter: 'Titre 7 - Sanctions', content: "Est puni d'un emprisonnement de un an \u00e0 sept ans et d'une amende de 500 000 \u00e0 10 000 000 de francs CFA ou de l'une de ces deux peines seulement, quiconque aura proc\u00e9d\u00e9 ou fait proc\u00e9der \u00e0 un traitement de donn\u00e9es \u00e0 caract\u00e8re personnel sans le consentement de la personne concern\u00e9e, en violation des dispositions de la pr\u00e9sente loi." },
    ],
    definitions: [
      { term: 'donn\u00e9es \u00e0 caract\u00e8re personnel', definition: "toute information relative \u00e0 une personne physique identifi\u00e9e ou identifiable directement ou indirectement, par r\u00e9f\u00e9rence \u00e0 un num\u00e9ro d'identification ou \u00e0 un ou plusieurs \u00e9l\u00e9ments propres \u00e0 son identit\u00e9", source_provision: 'art2' },
      { term: 'traitement de donn\u00e9es \u00e0 caract\u00e8re personnel', definition: "toute op\u00e9ration ou ensemble d'op\u00e9rations portant sur de telles donn\u00e9es, quel que soit le proc\u00e9d\u00e9 utilis\u00e9", source_provision: 'art2' },
      { term: 'responsable du traitement', definition: "la personne physique ou morale, l'autorit\u00e9 publique, le service ou tout autre organisme qui d\u00e9termine les finalit\u00e9s et les moyens du traitement", source_provision: 'art2' },
      { term: 'sous-traitant', definition: "toute personne physique ou morale qui traite des donn\u00e9es \u00e0 caract\u00e8re personnel pour le compte du responsable du traitement", source_provision: 'art2' },
      { term: 'personne concern\u00e9e', definition: "toute personne physique qui fait l'objet d'un traitement de donn\u00e9es \u00e0 caract\u00e8re personnel", source_provision: 'art2' },
    ],
  },

  // ---- CYBERCRIME LAW 2008-11 ----
  {
    title: 'Loi n\u00b0 2008-11 du 25 janvier 2008 sur la cybercriminalit\u00e9',
    title_en: 'Law No. 2008-11 of 25 January 2008 on Cybercrime',
    short_name: 'Loi 2008-11 (Cybercrime)',
    status: 'in_force',
    issued_date: '2008-01-25',
    in_force_date: '2008-01-25',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Loi s\u00e9n\u00e9galaise sur la cybercriminalit\u00e9 - incrimination des infractions informatiques',
    provisions: [
      { provision_ref: 'art1', section: '1', title: 'Article premier - Objet', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "La pr\u00e9sente loi a pour objet de d\u00e9finir les infractions li\u00e9es aux technologies de l'information et de la communication et d'\u00e9tablir les r\u00e8gles de proc\u00e9dure applicables \u00e0 la cybercriminalit\u00e9." },
      { provision_ref: 'art2', section: '2', title: 'Article 2 - Acc\u00e8s frauduleux', chapter: 'Titre 2 - Des infractions relatives aux syst\u00e8mes informatiques', content: "Est puni d'un emprisonnement de six mois \u00e0 trois ans et d'une amende de 1 000 000 \u00e0 10 000 000 de francs CFA ou de l'une de ces deux peines seulement quiconque acc\u00e8de ou tente d'acc\u00e9der frauduleusement \u00e0 tout ou partie d'un syst\u00e8me informatique." },
      { provision_ref: 'art3', section: '3', title: 'Article 3 - Maintien frauduleux', chapter: 'Titre 2 - Des infractions relatives aux syst\u00e8mes informatiques', content: "Est puni des m\u00eames peines quiconque se maintient ou tente de se maintenir frauduleusement dans tout ou partie d'un syst\u00e8me informatique." },
      { provision_ref: 'art4', section: '4', title: 'Article 4 - Atteinte \u00e0 l\'int\u00e9grit\u00e9', chapter: 'Titre 2 - Des infractions relatives aux syst\u00e8mes informatiques', content: "Est puni d'un emprisonnement de un an \u00e0 cinq ans et d'une amende de 5 000 000 \u00e0 50 000 000 de francs CFA quiconque a entrav\u00e9 ou fauss\u00e9 le fonctionnement d'un syst\u00e8me informatique." },
      { provision_ref: 'art5', section: '5', title: 'Article 5 - Atteinte aux donn\u00e9es', chapter: 'Titre 2 - Des infractions relatives aux syst\u00e8mes informatiques', content: "Est puni d'un emprisonnement de un an \u00e0 cinq ans et d'une amende de 5 000 000 \u00e0 50 000 000 de francs CFA quiconque a introduit, modifi\u00e9, supprim\u00e9 ou rendu inop\u00e9rant des donn\u00e9es informatiques frauduleusement." },
      { provision_ref: 'art6', section: '6', title: 'Article 6 - Interception', chapter: 'Titre 3 - Des infractions relatives aux donn\u00e9es informatiques', content: "Est puni d'un emprisonnement de un an \u00e0 cinq ans et d'une amende de 5 000 000 \u00e0 50 000 000 de francs CFA quiconque a intercept\u00e9 frauduleusement, par des moyens techniques, des donn\u00e9es informatiques lors de leur transmission." },
      { provision_ref: 'art7', section: '7', title: 'Article 7 - Falsification', chapter: 'Titre 3 - Des infractions relatives aux donn\u00e9es informatiques', content: "Est puni d'un emprisonnement de un an \u00e0 cinq ans et d'une amende de 5 000 000 \u00e0 50 000 000 de francs CFA quiconque a falsifi\u00e9 des donn\u00e9es informatiques de mani\u00e8re \u00e0 alt\u00e9rer leur v\u00e9racit\u00e9." },
      { provision_ref: 'art8', section: '8', title: 'Article 8 - Fraude informatique', chapter: 'Titre 3 - Des infractions relatives aux donn\u00e9es informatiques', content: "Est puni d'un emprisonnement de un an \u00e0 cinq ans et d'une amende de 5 000 000 \u00e0 50 000 000 de francs CFA quiconque a obtenu frauduleusement, pour soi-m\u00eame ou pour autrui, un avantage quelconque, en introduisant, en alt\u00e9rant, en effacant ou en supprimant des donn\u00e9es informatiques." },
      { provision_ref: 'art12', section: '12', title: 'Article 12 - Conservation des donn\u00e9es', chapter: 'Titre 4 - De la proc\u00e9dure', content: "Les fournisseurs d'acc\u00e8s et les fournisseurs d'h\u00e9bergement sont tenus de conserver les donn\u00e9es de connexion pendant une dur\u00e9e d'un an \u00e0 compter de leur enregistrement." },
    ],
    definitions: [],
  },

  // ---- ELECTRONIC TRANSACTIONS LAW 2008-08 ----
  {
    title: 'Loi n\u00b0 2008-08 du 25 janvier 2008 sur les transactions \u00e9lectroniques',
    title_en: 'Law No. 2008-08 of 25 January 2008 on Electronic Transactions',
    short_name: 'Loi 2008-08 (E-Commerce)',
    status: 'in_force',
    issued_date: '2008-01-25',
    in_force_date: '2008-01-25',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Loi s\u00e9n\u00e9galaise sur les transactions \u00e9lectroniques - commerce \u00e9lectronique et signature \u00e9lectronique',
    provisions: [
      { provision_ref: 'art1', section: '1', title: 'Article premier - Objet', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "La pr\u00e9sente loi fixe le r\u00e9gime juridique applicable aux transactions \u00e9lectroniques, notamment le commerce \u00e9lectronique, la signature \u00e9lectronique et la cryptologie." },
      { provision_ref: 'art3', section: '3', title: 'Article 3 - Signature \u00e9lectronique', chapter: 'Titre 2 - De la signature \u00e9lectronique', content: "La signature \u00e9lectronique consiste en l'usage d'un proc\u00e9d\u00e9 fiable d'identification garantissant son lien avec l'acte auquel elle s'attache. Lorsqu'elle est cr\u00e9\u00e9e et v\u00e9rifi\u00e9e selon les conditions fix\u00e9es par la pr\u00e9sente loi, la signature \u00e9lectronique a la m\u00eame valeur juridique qu'une signature manuscrite." },
      { provision_ref: 'art8', section: '8', title: 'Article 8 - Commerce \u00e9lectronique', chapter: 'Titre 3 - Du commerce \u00e9lectronique', content: "Le commerce \u00e9lectronique est l'activit\u00e9 \u00e9conomique par laquelle une personne propose ou assure, \u00e0 distance et par voie \u00e9lectronique, la fourniture de biens ou de services." },
      { provision_ref: 'art10', section: '10', title: 'Article 10 - Obligations du prestataire', chapter: 'Titre 3 - Du commerce \u00e9lectronique', content: "Tout prestataire de services de commerce \u00e9lectronique doit fournir un acc\u00e8s facile, direct et permanent aux informations suivantes : son nom ou sa d\u00e9nomination sociale, son adresse, ses coordonn\u00e9es t\u00e9l\u00e9phoniques et \u00e9lectroniques, son num\u00e9ro d'immatriculation au registre du commerce." },
      { provision_ref: 'art15', section: '15', title: 'Article 15 - Cryptologie', chapter: 'Titre 4 - De la cryptologie', content: "L'utilisation de moyens de cryptologie est libre. Toutefois, la fourniture, l'importation et l'exportation de moyens de cryptologie sont soumises \u00e0 d\u00e9claration pr\u00e9alable aupr\u00e8s de l'autorit\u00e9 comp\u00e9tente." },
    ],
    definitions: [
      { term: 'signature \u00e9lectronique', definition: "proc\u00e9d\u00e9 fiable d'identification garantissant le lien avec l'acte auquel elle s'attache", source_provision: 'art3' },
      { term: 'commerce \u00e9lectronique', definition: "activit\u00e9 \u00e9conomique par laquelle une personne propose ou assure, \u00e0 distance et par voie \u00e9lectronique, la fourniture de biens ou de services", source_provision: 'art8' },
    ],
  },

  // ---- CONSTITUTION 2001 ----
  {
    title: 'Constitution de la R\u00e9publique du S\u00e9n\u00e9gal du 22 janvier 2001',
    title_en: 'Constitution of the Republic of Senegal of 22 January 2001',
    short_name: 'Constitution 2001',
    status: 'in_force',
    issued_date: '2001-01-22',
    in_force_date: '2001-01-22',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Constitution de la R\u00e9publique du S\u00e9n\u00e9gal',
    provisions: [
      { provision_ref: 'art1', section: '1', title: 'Article premier', chapter: 'Titre premier - De l\'\u00c9tat et de la Souverainet\u00e9', content: "La R\u00e9publique du S\u00e9n\u00e9gal est la\u00efque, d\u00e9mocratique et sociale. Elle assure l'\u00e9galit\u00e9 devant la loi de tous les citoyens, sans distinction d'origine, de race, de sexe, de religion. Elle respecte toutes les croyances." },
      { provision_ref: 'art7', section: '7', title: 'Article 7 - Libert\u00e9 individuelle', chapter: 'Titre 2 - Des libert\u00e9s publiques et de la personne humaine', content: "La personne humaine est sacr\u00e9e. Elle est inviolable. L'\u00c9tat a l'obligation de la respecter et de la prot\u00e9ger." },
      { provision_ref: 'art8', section: '8', title: 'Article 8 - Droits fondamentaux', chapter: 'Titre 2 - Des libert\u00e9s publiques et de la personne humaine', content: "La R\u00e9publique du S\u00e9n\u00e9gal garantit \u00e0 tous les citoyens les libert\u00e9s individuelles fondamentales, les droits \u00e9conomiques et sociaux ainsi que les droits collectifs." },
      { provision_ref: 'art13', section: '13', title: 'Article 13 - Droit de propri\u00e9t\u00e9', chapter: 'Titre 2 - Des libert\u00e9s publiques et de la personne humaine', content: "Le droit de propri\u00e9t\u00e9 est garanti par la pr\u00e9sente Constitution. Il ne peut y \u00eatre port\u00e9 atteinte que dans le cas de n\u00e9cessit\u00e9 publique l\u00e9galement constat\u00e9e, sous r\u00e9serve d'une juste et pr\u00e9alable indemnit\u00e9." },
      { provision_ref: 'art25', section: '25', title: 'Article 25 - Libert\u00e9 d\'expression', chapter: 'Titre 2 - Des libert\u00e9s publiques et de la personne humaine', content: "Chacun a le droit d'exprimer et de diffuser librement ses opinions par la parole, la plume, l'image, la marche pacifique. Chacun a le droit de s'instruire sans entrave aux sources accessibles de la science et de la culture." },
    ],
    definitions: [],
  },

  // ---- BANKING REGULATION ----
  {
    title: 'Loi n\u00b0 90-06 portant r\u00e9glementation bancaire',
    title_en: 'Law No. 90-06 on Banking Regulation',
    short_name: 'Loi 90-06 (Banques)',
    status: 'in_force',
    issued_date: '1990-06-26',
    in_force_date: '1990-06-26',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Loi portant r\u00e9glementation bancaire au S\u00e9n\u00e9gal',
    provisions: [
      { provision_ref: 'art1', section: '1', title: 'Article premier - Champ d\'application', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "Sont consid\u00e9r\u00e9es comme \u00e9tablissements de cr\u00e9dit, les personnes morales qui effectuent \u00e0 titre de profession habituelle des op\u00e9rations de banque. Les op\u00e9rations de banque comprennent la r\u00e9ception de fonds du public, les op\u00e9rations de cr\u00e9dit et la mise \u00e0 la disposition de la client\u00e8le de moyens de paiement." },
      { provision_ref: 'art4', section: '4', title: 'Article 4 - Agr\u00e9ment', chapter: 'Titre 2 - De l\'acc\u00e8s \u00e0 la profession', content: "Nul ne peut exercer l'activit\u00e9 bancaire sur le territoire du S\u00e9n\u00e9gal sans avoir \u00e9t\u00e9 pr\u00e9alablement agr\u00e9\u00e9 par le Ministre charg\u00e9 des Finances, apr\u00e8s avis conforme de la Commission Bancaire de l'UMOA." },
      { provision_ref: 'art10', section: '10', title: 'Article 10 - Secret bancaire', chapter: 'Titre 3 - Du fonctionnement', content: "Tout membre d'un organe d'administration ou de direction d'un \u00e9tablissement de cr\u00e9dit, tout employ\u00e9 de celui-ci, est tenu au secret professionnel pour tout ce qui concerne les informations confidentielles qu'il d\u00e9tient du fait de ses fonctions." },
    ],
    definitions: [],
  },

  // ---- PENAL CODE (key cybercrime provisions) ----
  {
    title: 'Code p\u00e9nal (loi n\u00b0 65-60 du 21 juillet 1965)',
    title_en: 'Penal Code (Law No. 65-60 of 21 July 1965)',
    short_name: 'Code p\u00e9nal',
    status: 'amended',
    issued_date: '1965-07-21',
    in_force_date: '1965-07-21',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Code p\u00e9nal s\u00e9n\u00e9galais - code principal de droit p\u00e9nal',
    provisions: [
      { provision_ref: 'art1', section: '1', title: 'Article premier - Principe de l\u00e9galit\u00e9', chapter: 'Livre 1 - Dispositions g\u00e9n\u00e9rales', content: "Nul ne peut \u00eatre puni qu'en vertu d'une disposition l\u00e9gislative ou r\u00e9glementaire promulgu\u00e9e ant\u00e9rieurement \u00e0 la commission de l'infraction." },
      { provision_ref: 'art363bis', section: '363bis', title: 'Article 363 bis - Atteinte aux syst\u00e8mes informatiques', chapter: 'Livre 3 - Des crimes et d\u00e9lits', content: "Quiconque aura acc\u00e9d\u00e9 ou tent\u00e9 d'acc\u00e9der frauduleusement \u00e0 tout ou partie d'un syst\u00e8me de traitement automatis\u00e9 de donn\u00e9es est puni d'un emprisonnement de six mois \u00e0 trois ans et d'une amende de 500 000 \u00e0 5 000 000 de francs CFA ou de l'une de ces deux peines seulement." },
      { provision_ref: 'art431-7', section: '431-7', title: 'Article 431-7 - Escroquerie en ligne', chapter: 'Livre 3 - Des crimes et d\u00e9lits', content: "Quiconque aura commis une escroquerie par l'utilisation d'un syst\u00e8me informatique est puni d'un emprisonnement de un \u00e0 cinq ans et d'une amende de 500 000 \u00e0 10 000 000 de francs CFA." },
    ],
    definitions: [],
  },

  // ---- TELECOMMUNICATIONS CODE ----
  {
    title: 'Loi n\u00b0 2011-01 du 24 f\u00e9vrier 2011 portant Code des T\u00e9l\u00e9communications',
    title_en: 'Law No. 2011-01 of 24 February 2011 on Telecommunications Code',
    short_name: 'Code T\u00e9l\u00e9coms',
    status: 'in_force',
    issued_date: '2011-02-24',
    in_force_date: '2011-02-24',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Code des t\u00e9l\u00e9communications du S\u00e9n\u00e9gal',
    provisions: [
      { provision_ref: 'art1', section: '1', title: 'Article premier - Objet', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "La pr\u00e9sente loi fixe le cadre juridique des activit\u00e9s de t\u00e9l\u00e9communications au S\u00e9n\u00e9gal. Elle d\u00e9termine les conditions g\u00e9n\u00e9rales d'\u00e9tablissement et d'exploitation des r\u00e9seaux et services de t\u00e9l\u00e9communications." },
      { provision_ref: 'art3', section: '3', title: 'Article 3 - D\u00e9finitions', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "Au sens de la pr\u00e9sente loi, on entend par : t\u00e9l\u00e9communications : toute transmission, \u00e9mission ou r\u00e9ception de signes, de signaux, d'\u00e9crits, d'images, de sons ou de renseignements de toute nature, par fil, optique, radio\u00e9lectricit\u00e9 ou autres syst\u00e8mes \u00e9lectromagn\u00e9tiques." },
      { provision_ref: 'art6', section: '6', title: 'Article 6 - Autorit\u00e9 de r\u00e9gulation', chapter: 'Titre 2 - Du cadre institutionnel', content: "L'Autorit\u00e9 de R\u00e9gulation des T\u00e9l\u00e9communications et des Postes (ARTP) est charg\u00e9e de la r\u00e9gulation du secteur des t\u00e9l\u00e9communications." },
      { provision_ref: 'art20', section: '20', title: 'Article 20 - Protection des donn\u00e9es', chapter: 'Titre 4 - Des obligations des op\u00e9rateurs', content: "Les op\u00e9rateurs de t\u00e9l\u00e9communications sont tenus de prot\u00e9ger la confidentialit\u00e9 des communications et des donn\u00e9es personnelles de leurs abonn\u00e9s." },
    ],
    definitions: [
      { term: 't\u00e9l\u00e9communications', definition: "toute transmission, \u00e9mission ou r\u00e9ception de signes, de signaux, d'\u00e9crits, d'images, de sons ou de renseignements de toute nature, par fil, optique, radio\u00e9lectricit\u00e9 ou autres syst\u00e8mes \u00e9lectromagn\u00e9tiques", source_provision: 'art3' },
    ],
  },

  // ---- LABOR CODE ----
  {
    title: 'Code du Travail',
    title_en: 'Labor Code',
    short_name: 'Code du Travail',
    status: 'in_force',
    issued_date: '1997-12-01',
    in_force_date: '1997-12-01',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Code du travail du S\u00e9n\u00e9gal',
    provisions: [
      { provision_ref: 'artL1', section: 'L1', title: 'Article L.1 - Champ d\'application', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "Le pr\u00e9sent Code r\u00e9git les relations de travail entre les travailleurs et les employeurs exer\u00e7ant leur activit\u00e9 professionnelle au S\u00e9n\u00e9gal." },
      { provision_ref: 'artL3', section: 'L3', title: 'Article L.3 - D\u00e9finition du travailleur', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "Est consid\u00e9r\u00e9 comme travailleur quels que soient son sexe et sa nationalit\u00e9, toute personne qui s'est engag\u00e9e \u00e0 mettre son activit\u00e9 professionnelle, moyennant r\u00e9mun\u00e9ration, sous la direction et l'autorit\u00e9 d'une autre personne, physique ou morale, publique ou priv\u00e9e." },
    ],
    definitions: [
      { term: 'travailleur', definition: "toute personne qui s'est engag\u00e9e \u00e0 mettre son activit\u00e9 professionnelle, moyennant r\u00e9mun\u00e9ration, sous la direction et l'autorit\u00e9 d'une autre personne", source_provision: 'artL3' },
    ],
  },

  // ---- INVESTMENT CODE ----
  {
    title: 'Loi n\u00b0 2004-06 du 6 f\u00e9vrier 2004 portant Code des investissements',
    title_en: 'Law No. 2004-06 of 6 February 2004 on the Investment Code',
    short_name: 'Code des investissements',
    status: 'in_force',
    issued_date: '2004-02-06',
    in_force_date: '2004-02-06',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Code des investissements du S\u00e9n\u00e9gal',
    provisions: [
      { provision_ref: 'art1', section: '1', title: 'Article premier - Objet', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "La pr\u00e9sente loi fixe le r\u00e9gime de l'investissement au S\u00e9n\u00e9gal. Elle a pour objet de promouvoir et d'encourager les investissements productifs au S\u00e9n\u00e9gal." },
      { provision_ref: 'art2', section: '2', title: 'Article 2 - Champ d\'application', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "La pr\u00e9sente loi s'applique aux entreprises qui investissent dans les activit\u00e9s de production de biens et de services au S\u00e9n\u00e9gal, quels que soient leur secteur d'activit\u00e9 et leur nationalit\u00e9." },
      { provision_ref: 'art4', section: '4', title: 'Article 4 - Garanties', chapter: 'Titre 2 - Des garanties accord\u00e9es aux investisseurs', content: "L'\u00c9tat garantit la libert\u00e9 d'investir au S\u00e9n\u00e9gal, le droit de propri\u00e9t\u00e9, la libre circulation des capitaux, la libre conversion des b\u00e9n\u00e9fices et des dividendes, et la protection des investissements." },
    ],
    definitions: [],
  },

  // ---- ANTI-MONEY LAUNDERING ----
  {
    title: 'Loi n\u00b0 2004-09 du 6 f\u00e9vrier 2004 relative \u00e0 la lutte contre le blanchiment de capitaux',
    title_en: 'Law No. 2004-09 of 6 February 2004 on Anti-Money Laundering',
    short_name: 'LBC 2004-09',
    status: 'in_force',
    issued_date: '2004-02-06',
    in_force_date: '2004-02-06',
    url: 'https://primature.sn/publications/lois-et-reglements',
    description: 'Loi relative \u00e0 la lutte contre le blanchiment de capitaux au S\u00e9n\u00e9gal',
    provisions: [
      { provision_ref: 'art1', section: '1', title: 'Article premier - D\u00e9finition du blanchiment', chapter: 'Titre 1 - Dispositions g\u00e9n\u00e9rales', content: "Constituent un blanchiment de capitaux, les actes ci-apr\u00e8s, commis intentionnellement : la conversion ou le transfert de biens dans le but de dissimuler ou de d\u00e9guiser l'origine illicite desdits biens." },
      { provision_ref: 'art5', section: '5', title: 'Article 5 - Obligation de vigilance', chapter: 'Titre 2 - Des obligations de vigilance', content: "Les organismes financiers sont tenus d'identifier leurs clients et de v\u00e9rifier leur identit\u00e9 lors de l'\u00e9tablissement de la relation d'affaires, lors de toute transaction d'un montant \u00e9gal ou sup\u00e9rieur \u00e0 5 000 000 de francs CFA." },
      { provision_ref: 'art10', section: '10', title: 'Article 10 - D\u00e9claration de soup\u00e7on', chapter: 'Titre 3 - Des d\u00e9clarations', content: "Les organismes financiers sont tenus de d\u00e9clarer \u00e0 la Cellule Nationale de Traitement des Informations Financi\u00e8res (CENTIF) les op\u00e9rations suspectes." },
    ],
    definitions: [
      { term: 'blanchiment de capitaux', definition: "la conversion ou le transfert de biens dans le but de dissimuler ou de d\u00e9guiser l'origine illicite desdits biens", source_provision: 'art1' },
    ],
  },
];

/* ---------- Main ---------- */

function main(): void {
  console.log('Senegal Law MCP -- Curated Seed Generator');
  console.log('==========================================\n');

  fs.mkdirSync(SEED_DIR, { recursive: true });

  let totalDocs = 0;
  let totalProvisions = 0;
  let totalDefinitions = 0;

  for (const seed of SEEDS) {
    const id = titleToId(seed.title);
    const seedFile = path.join(SEED_DIR, `${id}.json`);

    const parsed: ParsedAct = {
      id,
      type: 'statute',
      title: seed.title,
      title_en: seed.title_en,
      short_name: seed.short_name,
      status: seed.status,
      issued_date: seed.issued_date,
      in_force_date: seed.in_force_date,
      url: seed.url,
      description: seed.description,
      provisions: seed.provisions,
      definitions: seed.definitions,
    };

    fs.writeFileSync(seedFile, JSON.stringify(parsed, null, 2));
    totalDocs++;
    totalProvisions += seed.provisions.length;
    totalDefinitions += seed.definitions.length;

    console.log(`  [${totalDocs}] ${seed.short_name}: ${seed.provisions.length} provisions, ${seed.definitions.length} definitions`);
  }

  console.log(`\n==========================================`);
  console.log(`Seed Generation Complete`);
  console.log(`==========================================`);
  console.log(`  Documents:    ${totalDocs}`);
  console.log(`  Provisions:   ${totalProvisions}`);
  console.log(`  Definitions:  ${totalDefinitions}`);
  console.log(`  Output: ${SEED_DIR}/`);

  // Update census with provision counts
  if (fs.existsSync(CENSUS_PATH)) {
    const census = JSON.parse(fs.readFileSync(CENSUS_PATH, 'utf-8'));
    const today = new Date().toISOString().split('T')[0];
    for (const law of census.laws) {
      const seedPath = path.join(SEED_DIR, `${law.id}.json`);
      if (fs.existsSync(seedPath)) {
        const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
        law.ingested = true;
        law.provision_count = seedData.provisions?.length ?? 0;
        law.ingestion_date = today;
      }
    }
    // Recalculate summary
    census.summary.total_laws = census.laws.length;
    census.summary.ingestable = census.laws.filter((l: { classification: string }) => l.classification === 'ingestable').length;
    fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2));
    console.log(`\n  Census updated: ${CENSUS_PATH}`);
  }
}

main();
