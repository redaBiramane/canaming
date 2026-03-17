
-- Dictionary table
CREATE TABLE public.dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terme_source text NOT NULL,
  abreviation text NOT NULL,
  description text NOT NULL DEFAULT '',
  synonymes text[] NOT NULL DEFAULT '{}',
  categorie text NOT NULL DEFAULT 'Général',
  actif boolean NOT NULL DEFAULT true,
  date_maj date NOT NULL DEFAULT CURRENT_DATE,
  auteur text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dictionary ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read dictionary
CREATE POLICY "Authenticated users can read dictionary"
  ON public.dictionary FOR SELECT TO authenticated USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert dictionary"
  ON public.dictionary FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update dictionary"
  ON public.dictionary FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete dictionary"
  ON public.dictionary FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- History table
CREATE TABLE public.history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL DEFAULT now(),
  auteur text NOT NULL,
  action text NOT NULL,
  terme text NOT NULL DEFAULT '',
  ancienne_valeur text,
  nouvelle_valeur text,
  champ text,
  details jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Users see their own history, admins see all
CREATE POLICY "Users can read own history"
  ON public.history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- All authenticated users can insert history
CREATE POLICY "Authenticated users can insert history"
  ON public.history FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only admins can delete history
CREATE POLICY "Admins can delete history"
  ON public.history FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Signalements table
CREATE TABLE public.signalements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mot text NOT NULL,
  contexte text NOT NULL DEFAULT '',
  date timestamptz NOT NULL DEFAULT now(),
  auteur text NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.signalements ENABLE ROW LEVEL SECURITY;

-- Users see their own signalements, admins see all
CREATE POLICY "Users can read own signalements"
  ON public.signalements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- All authenticated users can insert signalements
CREATE POLICY "Authenticated users can insert signalements"
  ON public.signalements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only admins can update signalements (accept/reject)
CREATE POLICY "Admins can update signalements"
  ON public.signalements FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Stats table for global counters
CREATE TABLE public.app_stats (
  id text PRIMARY KEY DEFAULT 'global',
  transformation_count integer NOT NULL DEFAULT 0,
  unknown_words_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.app_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stats"
  ON public.app_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update stats"
  ON public.app_stats FOR UPDATE TO authenticated USING (true);

-- Insert default row
INSERT INTO public.app_stats (id, transformation_count, unknown_words_count) VALUES ('global', 0, 0);

-- Insert default dictionary entries
INSERT INTO public.dictionary (terme_source, abreviation, description, synonymes, categorie, actif, date_maj, auteur) VALUES
  ('montant', 'MNT', 'Montant financier', ARRAY['somme', 'total'], 'Finance', true, '2026-03-01', 'admin'),
  ('code', 'COD', 'Code identifiant', ARRAY['identifiant'], 'Général', true, '2026-03-01', 'admin'),
  ('salaire', 'SAL', 'Salaire', ARRAY['rémunération', 'remuneration', 'paie'], 'RH', true, '2026-03-01', 'admin'),
  ('date', 'DAT', 'Date', ARRAY[]::text[], 'Général', true, '2026-03-01', 'admin'),
  ('client', 'CLT', 'Client', ARRAY['clt', 'consommateur'], 'Commercial', true, '2026-03-01', 'admin'),
  ('numéro', 'NUM', 'Numéro', ARRAY['numero', 'no', 'n°'], 'Général', true, '2026-03-01', 'admin'),
  ('agence', 'AGC', 'Agence bancaire', ARRAY['succursale', 'bureau'], 'Structure', true, '2026-03-01', 'admin'),
  ('naissance', 'NAIS', 'Naissance', ARRAY['né', 'ne'], 'Civil', true, '2026-03-01', 'admin'),
  ('compte', 'CPT', 'Compte bancaire', ARRAY[]::text[], 'Finance', true, '2026-03-01', 'admin'),
  ('type', 'TYP', 'Type / catégorie', ARRAY['categorie', 'genre'], 'Général', true, '2026-03-01', 'admin'),
  ('libellé', 'LIB', 'Libellé descriptif', ARRAY['libelle', 'label', 'intitulé'], 'Général', true, '2026-03-01', 'admin'),
  ('identifiant', 'IDT', 'Identifiant unique', ARRAY['id'], 'Général', true, '2026-03-01', 'admin'),
  ('adresse', 'ADR', 'Adresse postale', ARRAY['adr'], 'Contact', true, '2026-03-01', 'admin'),
  ('téléphone', 'TEL', 'Numéro de téléphone', ARRAY['telephone', 'tel', 'phone'], 'Contact', true, '2026-03-01', 'admin'),
  ('email', 'EML', 'Adresse email', ARRAY['mail', 'courriel'], 'Contact', true, '2026-03-01', 'admin'),
  ('nom', 'NOM', 'Nom de famille', ARRAY['patronyme'], 'Civil', true, '2026-03-01', 'admin'),
  ('prénom', 'PRN', 'Prénom', ARRAY['prenom'], 'Civil', true, '2026-03-01', 'admin'),
  ('devise', 'DEV', 'Devise monétaire', ARRAY['monnaie', 'currency'], 'Finance', true, '2026-03-01', 'admin'),
  ('solde', 'SLD', 'Solde du compte', ARRAY['balance'], 'Finance', true, '2026-03-01', 'admin'),
  ('opération', 'OPE', 'Opération bancaire', ARRAY['operation', 'transaction'], 'Finance', true, '2026-03-01', 'admin'),
  ('pays', 'PAY', 'Pays', ARRAY['nation'], 'Géographie', true, '2026-03-01', 'admin'),
  ('ville', 'VIL', 'Ville', ARRAY['commune', 'cité'], 'Géographie', true, '2026-03-01', 'admin'),
  ('région', 'REG', 'Région', ARRAY['region'], 'Géographie', true, '2026-03-01', 'admin'),
  ('statut', 'STT', 'Statut', ARRAY['état', 'etat', 'status'], 'Général', true, '2026-03-01', 'admin'),
  ('description', 'DSC', 'Description', ARRAY['desc'], 'Général', true, '2026-03-01', 'admin'),
  ('crédit', 'CRD', 'Montant au crédit', ARRAY['credit'], 'Finance', true, '2026-03-01', 'admin'),
  ('débit', 'DBT', 'Montant au débit', ARRAY['debit'], 'Finance', true, '2026-03-01', 'admin'),
  ('taux', 'TAX', 'Taux', ARRAY['pourcentage', 'ratio'], 'Finance', true, '2026-03-01', 'admin'),
  ('contrat', 'CTR', 'Contrat', ARRAY['convention', 'accord'], 'Juridique', true, '2026-03-01', 'admin'),
  ('produit', 'PRD', 'Produit financier', ARRAY['offre'], 'Commercial', true, '2026-03-01', 'admin'),
  ('référence', 'REF', 'Référence unique', ARRAY['reference', 'ref'], 'Général', true, '2026-03-01', 'admin'),
  ('total', 'TOT', 'Total cumulé', ARRAY['cumul'], 'Finance', true, '2026-03-01', 'admin'),
  ('début', 'DEB', 'Date ou point de début', ARRAY['debut', 'commencement'], 'Général', true, '2026-03-01', 'admin'),
  ('fin', 'FIN', 'Date ou point de fin', ARRAY['terme', 'clôture'], 'Général', true, '2026-03-01', 'admin'),
  ('banque', 'BNQ', 'Établissement bancaire', ARRAY['établissement'], 'Structure', true, '2026-03-01', 'admin');

-- Allow insert on app_stats for initialization
CREATE POLICY "Authenticated users can insert stats"
  ON public.app_stats FOR INSERT TO authenticated
  WITH CHECK (true);
