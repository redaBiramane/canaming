import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TextCursorInput, Code2, BookOpen, Flag, History, Settings, BarChart3,
  Upload, Download, Search, Plus, Pencil, Trash2, CheckCircle2, XCircle,
  RotateCcw, FileDown, ShieldCheck, Users, ArrowRight, Home, LogIn,
} from "lucide-react";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.div {...fadeIn}>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
      <div>{children}</div>
    </div>
  );
}

function FeatureBadge({ children }: { children: React.ReactNode }) {
  return <Badge variant="secondary" className="text-xs">{children}</Badge>;
}

function UserGuide() {
  return (
    <div className="space-y-6">
      <Section icon={Home} title="Accueil">
        <p>La page d'accueil affiche un résumé rapide de la plateforme : le nombre de termes dans le dictionnaire, et des raccourcis vers les principales fonctionnalités.</p>
        <div className="flex gap-2 flex-wrap">
          <FeatureBadge>Raccourcis rapides</FeatureBadge>
          <FeatureBadge>Résumé du dictionnaire</FeatureBadge>
        </div>
      </Section>

      <Section icon={TextCursorInput} title="Renommer des colonnes">
        <p>Cette page vous permet de renommer vos colonnes SQL selon le dictionnaire de nommage du Crédit Agricole.</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>Saisissez vos noms de colonnes dans les champs de texte (un par ligne).</Step>
          <Step n={2}>Cliquez sur <strong>« Analyser »</strong> pour lancer la transformation automatique.</Step>
          <Step n={3}>Consultez le résultat : chaque segment est coloré selon son statut.</Step>
          <Step n={4}>Si besoin, éditez manuellement un segment en cliquant sur le nom proposé.</Step>
          <Step n={5}>Utilisez le bouton <strong>« Copier »</strong> pour récupérer le nom transformé.</Step>
        </div>
        <div className="mt-3 p-3 bg-muted rounded-lg">
          <p className="font-medium text-foreground mb-1">Légende des couleurs :</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> <strong>Vert</strong> — Terme trouvé dans le dictionnaire</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> <strong>Jaune</strong> — Synonyme détecté</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> <strong>Rouge</strong> — Terme inconnu (non trouvé)</li>
          </ul>
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          <FeatureBadge>Saisie manuelle</FeatureBadge>
          <FeatureBadge>Édition inline</FeatureBadge>
          <FeatureBadge>Copier le résultat</FeatureBadge>
          <FeatureBadge>Signaler un terme inconnu</FeatureBadge>
          <FeatureBadge>Signaler tout</FeatureBadge>
          <FeatureBadge>Remise à zéro</FeatureBadge>
        </div>
      </Section>

      <Section icon={Code2} title="Analyse SQL">
        <p>Collez un script SQL complet (CREATE TABLE, ALTER TABLE…) et l'outil transforme automatiquement les noms de colonnes.</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>Collez votre script SQL dans la zone de texte.</Step>
          <Step n={2}>Cliquez sur <strong>« Analyser le SQL »</strong>.</Step>
          <Step n={3}>Le script transformé s'affiche avec les colonnes renommées selon le dictionnaire.</Step>
          <Step n={4}>Consultez le détail de chaque colonne avec les mêmes codes couleur.</Step>
          <Step n={5}>Copiez le SQL transformé ou exportez-le.</Step>
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          <FeatureBadge>Parsing SQL automatique</FeatureBadge>
          <FeatureBadge>Prévisualisation avant/après</FeatureBadge>
          <FeatureBadge>Export du script</FeatureBadge>
          <FeatureBadge>Signaler tout</FeatureBadge>
          <FeatureBadge>Remise à zéro</FeatureBadge>
        </div>
      </Section>

      <Section icon={BarChart3} title="Tableau de bord">
        <p>Le tableau de bord offre une vue synthétique de l'activité de la plateforme :</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Nombre total de termes dans le dictionnaire</li>
          <li>Nombre de signalements en attente</li>
          <li>Statistiques d'utilisation et historique des actions</li>
          <li>Répartition par catégorie</li>
        </ul>
      </Section>

      <Section icon={Flag} title="Signaler un terme inconnu">
        <p>Quand un mot n'est pas reconnu par le dictionnaire, vous pouvez le signaler pour qu'un administrateur l'ajoute :</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>Sur la page Renommer ou Analyse SQL, cliquez sur l'icône <strong>drapeau</strong> à côté du terme inconnu, ou utilisez le bouton <strong>« Signaler tout »</strong>.</Step>
          <Step n={2}>Le terme est enregistré avec son contexte d'utilisation.</Step>
          <Step n={3}>Un administrateur traitera votre signalement (accepté ou rejeté).</Step>
        </div>
      </Section>

      <Section icon={FileDown} title="Export des signalements">
        <p>Sur la page <strong>Signalements</strong>, vous pouvez exporter la liste filtrée au format <strong>Excel</strong> ou <strong>CSV</strong> pour en discuter en comité ou la partager avec votre équipe.</p>
      </Section>
    </div>
  );
}

function AdminGuide() {
  return (
    <div className="space-y-6">
      <Section icon={ShieldCheck} title="Rôles et autorisations">
        <p>La plateforme distingue deux rôles :</p>
        <div className="mt-2 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Fonctionnalité</th>
                <th className="text-center p-3 font-medium">Utilisateur</th>
                <th className="text-center p-3 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Renommer des colonnes", true, true],
                ["Analyse SQL", true, true],
                ["Tableau de bord", true, true],
                ["Signaler un terme inconnu", true, true],
                ["Exporter les signalements", true, true],
                ["Consulter le dictionnaire", true, true],
                ["Ajouter / modifier / supprimer un terme", false, true],
                ["Importer / exporter le dictionnaire Excel", false, true],
                ["Gérer les signalements (accepter / rejeter)", false, true],
                ["Consulter l'historique complet", false, true],
                ["Gérer les paramètres", false, true],
              ].map(([label, user, admin], i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{label as string}</td>
                  <td className="p-3 text-center">{user ? <CheckCircle2 className="h-4 w-4 text-green-600 inline" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 inline" />}</td>
                  <td className="p-3 text-center">{admin ? <CheckCircle2 className="h-4 w-4 text-green-600 inline" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 inline" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={BookOpen} title="Gestion du dictionnaire">
        <p>En tant qu'administrateur, vous avez un contrôle complet sur le dictionnaire de nommage :</p>
        <div className="space-y-2 mt-2">
          <div className="flex items-start gap-2">
            <Plus className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div><strong>Ajouter un terme</strong> — Renseignez le terme source, l'abréviation, la description, les synonymes et la catégorie.</div>
          </div>
          <div className="flex items-start gap-2">
            <Pencil className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div><strong>Modifier un terme</strong> — Cliquez sur l'icône crayon dans la colonne Actions.</div>
          </div>
          <div className="flex items-start gap-2">
            <Trash2 className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div><strong>Supprimer un terme</strong> — Cliquez sur l'icône corbeille (confirmation requise).</div>
          </div>
          <div className="flex items-start gap-2">
            <Search className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div><strong>Rechercher / Filtrer</strong> — Utilisez la barre de recherche et le filtre par catégorie.</div>
          </div>
        </div>
      </Section>

      <Section icon={Upload} title="Import / Export Excel">
        <p>Le dictionnaire peut être importé et exporté au format Excel (.xlsx) :</p>
        <div className="space-y-2 mt-2">
          <Step n={1}><strong>Importer</strong> — Cliquez sur « Importer Excel » et sélectionnez votre fichier .xlsx. Les colonnes attendues sont : terme_source, abreviation, description, synonymes, categorie.</Step>
          <Step n={2}><strong>Exporter</strong> — Cliquez sur « Exporter Excel » pour télécharger l'intégralité du dictionnaire.</Step>
        </div>
        <div className="mt-2 p-3 bg-muted rounded-lg">
          <p className="font-medium text-foreground mb-1">⚠️ Remarque :</p>
          <p>L'import fusionne les termes : les termes existants sont mis à jour, les nouveaux sont ajoutés. Aucun terme n'est supprimé lors d'un import.</p>
        </div>
      </Section>

      <Section icon={Flag} title="Gestion des signalements">
        <p>Les utilisateurs signalent les termes inconnus. L'administrateur peut :</p>
        <div className="space-y-2 mt-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div><strong>Accepter</strong> — Le terme sera ajouté au dictionnaire (vous devrez ensuite le créer manuellement dans le dictionnaire).</div>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div><strong>Rejeter</strong> — Le signalement est marqué comme non pertinent.</div>
          </div>
          <div className="flex items-start gap-2">
            <FileDown className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div><strong>Exporter</strong> — Téléchargez la liste en Excel ou CSV pour discussion en comité.</div>
          </div>
        </div>
      </Section>

      <Section icon={History} title="Historique">
        <p>L'historique retrace toutes les actions effectuées sur la plateforme :</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Ajout, modification et suppression de termes</li>
          <li>Import de dictionnaire</li>
          <li>Traitement des signalements</li>
        </ul>
        <p className="mt-1">Chaque entrée indique l'auteur, la date et le détail de l'action.</p>
      </Section>

      <Section icon={Settings} title="Paramètres">
        <p>La page Paramètres permet de configurer les préférences de la plateforme (réservée aux administrateurs).</p>
      </Section>

      <Section icon={Users} title="Gestion des utilisateurs">
        <p>Les rôles sont attribués dans la base de données. Pour promouvoir un utilisateur en administrateur, contactez l'équipe technique ou utilisez la console d'administration de la base de données.</p>
      </Section>
    </div>
  );
}

export default function DocumentationPage() {
  const { role } = useAuth();
  const [tab, setTab] = useState("user");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documentation</h1>
        <p className="text-muted-foreground mt-1">Guide d'utilisation de Naming Studio</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="user">Guide Utilisateur</TabsTrigger>
          <TabsTrigger value="admin">Guide Administrateur</TabsTrigger>
        </TabsList>

        <TabsContent value="user" className="mt-4">
          <UserGuide />
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
          <AdminGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}
