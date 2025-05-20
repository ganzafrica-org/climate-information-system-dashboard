import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    BookOpen,
    Download,
    ExternalLink,
    FileText,
    Filter,
    Headphones,
    Info,
    LayoutGrid,
    List,
    Play,
    Search,
    Smartphone,
    Video,
    ArrowLeft,
    Share,
    Clock
} from 'lucide-react';
import {Label} from "@/components/ui/label";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";

const CloudIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
);

const LeafIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M16 14h.01" />
        <path d="M8 18h.01" />
        <path d="M12 18h.01" />
        <path d="M16 18h.01" />
    </svg>
);

const BugIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m8 2 1.88 1.88" />
        <path d="M14.12 3.88 16 2" />
        <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
        <path d="M12 20v-9" />
        <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
        <path d="M6 13H2" />
        <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
        <path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4" />
        <path d="M18 13h4" />
        <path d="M21 21c0-2.1-1.7-3.9-3.8-4" />
    </svg>
);

const DropletIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
);

const LayersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
        <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
);

// Sample training materials data
const trainingModules = [
    {
        id: 'weather-understanding',
        title: 'weatherUnderstanding',
        description: 'weatherUnderstandingDesc',
        icon: <CloudIcon className="h-6 w-6" />,
        level: 'beginner',
        duration: 30,
        format: 'video',
        completionRate: 85,
        popular: true
    },
    {
        id: 'climate-resilient-farming',
        title: 'climateResilientFarming',
        description: 'climateResilientFarmingDesc',
        icon: <LeafIcon className="h-6 w-6" />,
        level: 'intermediate',
        duration: 45,
        format: 'interactive',
        completionRate: 72,
        new: true
    },
    {
        id: 'seasonal-planning',
        title: 'seasonalPlanning',
        description: 'seasonalPlanningDesc',
        icon: <CalendarIcon className="h-6 w-6" />,
        level: 'beginner',
        duration: 25,
        format: 'document',
        completionRate: 92
    },
    {
        id: 'pest-management',
        title: 'pestManagement',
        description: 'pestManagementDesc',
        icon: <BugIcon className="h-6 w-6" />,
        level: 'advanced',
        duration: 60,
        format: 'interactive',
        completionRate: 68,
        popular: true
    },
    {
        id: 'water-conservation',
        title: 'waterConservation',
        description: 'waterConservationDesc',
        icon: <DropletIcon className="h-6 w-6" />,
        level: 'intermediate',
        duration: 40,
        format: 'audio',
        completionRate: 76
    },
    {
        id: 'soil-health',
        title: 'soilHealth',
        description: 'soilHealthDesc',
        icon: <LayersIcon className="h-6 w-6" />,
        level: 'beginner',
        duration: 35,
        format: 'document',
        completionRate: 88,
        new: true
    },
];

const faqs = [
    {
        question: 'faqQuestion1',
        answer: 'faqAnswer1'
    },
    {
        question: 'faqQuestion2',
        answer: 'faqAnswer2'
    },
    {
        question: 'faqQuestion3',
        answer: 'faqAnswer3'
    },
    {
        question: 'faqQuestion4',
        answer: 'faqAnswer4'
    },
    {
        question: 'faqQuestion5',
        answer: 'faqAnswer5'
    },
    {
        question: 'faqQuestion6',
        answer: 'faqAnswer6'
    }
];

const ModuleDetail = ({ module, onBack, t }: { module: any, onBack: () => void, t: (key: string) => string }) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('back')}
                        </Button>
                        <h3 className="text-lg font-medium">{t(module.title)}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            {t('downloadMaterials')}
                        </Button>
                        <Button variant="outline" size="sm">
                            <Share className="h-4 w-4 mr-2" />
                            {t('share')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
              module.level === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  module.level === 'intermediate' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
          }`}>
            {t(module.level)}
          </span>
                    <span className="text-xs flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full">
            {module.format === 'video' ? <Video className="h-4 w-4" /> :
                module.format === 'document' ? <FileText className="h-4 w-4" /> :
                    module.format === 'audio' ? <Headphones className="h-4 w-4" /> :
                        <Smartphone className="h-4 w-4" />}
                        {t(module.format)}
          </span>
                    <span className="text-xs flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full">
            <Clock className="h-3 w-3" />
                        {module.duration} {t('minutes')}
          </span>
                </div>

                <p className="text-muted-foreground">{t(module.description)}</p>

                <div className="border rounded-lg overflow-hidden">
                    {module.format === 'video' && (
                        <div className="aspect-video bg-black/95 flex items-center justify-center relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Button size="icon" className="h-16 w-16 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground">
                                    <Play className="h-8 w-8" />
                                </Button>
                            </div>
                            <p className="text-primary-foreground text-sm absolute bottom-4 left-4">{t('videoDescription')}</p>
                        </div>
                    )}

                    {module.format === 'interactive' && (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                            <div className="text-center">
                                <Smartphone className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
                                <h3 className="font-medium">{t('interactiveContent')}</h3>
                                <p className="text-sm text-muted-foreground mt-2">{t('interactiveDescription')}</p>
                                <Button className="mt-4">
                                    {t('startInteractive')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {module.format === 'document' && (
                        <div className="p-6 bg-muted">
                            <div className="text-center">
                                <FileText className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
                                <h3 className="font-medium">{t('documentContent')}</h3>
                                <p className="text-sm text-muted-foreground mt-2">{t('documentDescription')}</p>
                                <Button className="mt-4">
                                    <FileText className="h-4 w-4 mr-2" />
                                    {t('openDocument')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {module.format === 'audio' && (
                        <div className="p-6 bg-muted">
                            <div className="text-center">
                                <Headphones className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
                                <h3 className="font-medium">{t('audioContent')}</h3>
                                <p className="text-sm text-muted-foreground mt-2">{t('audioDescription')}</p>
                                <div className="mt-4 flex justify-center">
                                    <div className="flex items-center gap-2 border rounded-md p-2 bg-background">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                                            <Play className="h-4 w-4" />
                                        </Button>
                                        <div className="w-48 h-1 bg-muted rounded-full">
                                            <div className="w-1/3 h-full bg-primary rounded-full"></div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">10:15</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-lg font-medium mb-3">{t('moduleOutline')}</h3>
                    <div className="space-y-3">
                        <div className="p-3 border rounded-md bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 flex items-center justify-center text-xs font-medium">1</div>
                                <span>{t('introduction')}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">5 {t('minutes')}</div>
                        </div>
                        <div className="p-3 border rounded-md bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 flex items-center justify-center text-xs font-medium">2</div>
                                <span>{t('keyPrinciples')}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">10 {t('minutes')}</div>
                        </div>
                        <div className="p-3 border rounded-md bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 flex items-center justify-center text-xs font-medium">3</div>
                                <span>{t('practicalExamples')}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">10 {t('minutes')}</div>
                        </div>
                        <div className="p-3 border rounded-md bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">4</div>
                                <span>{t('implementation')}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">15 {t('minutes')}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium mb-3">{t('relatedModules')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {trainingModules
                            .filter(m => m.id !== module.id)
                            .slice(0, 2)
                            .map(relatedModule => (
                                <div key={relatedModule.id} className="p-3 border rounded-md hover:bg-muted/30 transition-colors cursor-pointer">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                                            {relatedModule.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-medium">{t(relatedModule.title)}</h4>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t(relatedModule.description)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="border-t flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('exploreAllModules')}
                    </Button>
                </div>
                <Button>
                    {module.completionRate < 100 ? t('continueModule') : t('restartModule')}
                </Button>
            </CardFooter>
        </Card>
    );
};

const Training: NextPage = () => {
    const { t } = useLanguage();
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [formatFilter, setFormatFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('modules');
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [selectedModule, setSelectedModule] = useState<string | null>(null);

    const filteredModules = trainingModules.filter((module) => {
        const matchesSearch = searchTerm === '' ||
            t(module.title).toLowerCase().includes(searchTerm.toLowerCase()) ||
            t(module.description).toLowerCase().includes(searchTerm.toLowerCase());

        const matchesLevel = levelFilter === 'all' || module.level === levelFilter;
        const matchesFormat = formatFilter === 'all' || module.format === formatFilter;

        return matchesSearch && matchesLevel && matchesFormat;
    });

    const getFormatIcon = (format: string) => {
        switch (format) {
            case 'video': return <Video className="h-4 w-4" />;
            case 'document': return <FileText className="h-4 w-4" />;
            case 'audio': return <Headphones className="h-4 w-4" />;
            case 'interactive': return <Smartphone className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const getLevelBadge = (level: string) => {
        const colors = {
            beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            intermediate: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            advanced: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
        };

        return (
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors[level as keyof typeof colors]}`}>
        {t(level)}
      </span>
        );
    };

    return (
        <AppLayout>
            <Head>
                <title>{t('training')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-ganz-primary" />
                    <h2 className="text-xl font-medium">{t('training')}</h2>
                </div>

                <Tabs defaultValue="modules" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="modules">
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            {t('trainingModules')}
                        </TabsTrigger>
                        <TabsTrigger value="faq">
                            <Info className="h-4 w-4 mr-2" />
                            {t('frequentlyAskedQuestions')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="modules" className="space-y-4 mt-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder={t('searchTraining')}
                                    className="pl-8 w-full sm:w-[250px] h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex w-full sm:w-auto items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setView(view === 'grid' ? 'list' : 'grid')}>
                                    {view === 'grid' ? (
                                        <><List className="h-4 w-4 mr-2" />{t('listView')}</>
                                    ) : (
                                        <><LayoutGrid className="h-4 w-4 mr-2" />{t('gridView')}</>
                                    )}
                                </Button>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <Filter className="h-4 w-4 mr-2" />
                                            {t('filter')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>{t('filterTrainingModules')}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">{t('level')}</Label>
                                                <Select value={levelFilter} onValueChange={setLevelFilter}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('all')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('all')}</SelectItem>
                                                        <SelectItem value="beginner">{t('beginner')}</SelectItem>
                                                        <SelectItem value="intermediate">{t('intermediate')}</SelectItem>
                                                        <SelectItem value="advanced">{t('advanced')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">{t('format')}</Label>
                                                <Select value={formatFilter} onValueChange={setFormatFilter}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('all')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('all')}</SelectItem>
                                                        <SelectItem value="video">{t('video')}</SelectItem>
                                                        <SelectItem value="document">{t('document')}</SelectItem>
                                                        <SelectItem value="audio">{t('audio')}</SelectItem>
                                                        <SelectItem value="interactive">{t('interactive')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => {
                                                setLevelFilter('all');
                                                setFormatFilter('all');
                                            }}>
                                                {t('reset')}
                                            </Button>
                                            <Button type="submit">
                                                {t('apply')}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                            </div>
                        </div>

                        {selectedModule ? (
                            <ModuleDetail
                                module={trainingModules.find(m => m.id === selectedModule)!}
                                onBack={() => setSelectedModule(null)}
                                t={t}
                            />
                        ) : (
                            <>
                                {filteredModules.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                                <Search className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <h3 className="font-medium">{t('noModulesFound')}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">{t('tryDifferentSearch')}</p>
                                        </CardContent>
                                    </Card>
                                ) : view === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredModules.map((module) => (
                                            <Card key={module.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedModule(module.id)}>
                                                <CardHeader className="pb-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                                                            {module.icon}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {module.new && (
                                                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                                    {t('new')}
                                                                </Badge>
                                                            )}
                                                            {module.popular && (
                                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                                    {t('popular')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <CardTitle className="text-base mt-2">{t(module.title)}</CardTitle>
                                                    <CardDescription className="line-clamp-2">{t(module.description)}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="pb-4">
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {getLevelBadge(module.level)}
                                                        <span className="text-xs flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full">
                              {getFormatIcon(module.format)}
                                                            {t(module.format)}
                            </span>
                                                        <span className="text-xs flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full">
                              <Clock className="h-3 w-3" />
                                                            {module.duration} {t('minutes')}
                            </span>
                                                    </div>

                                                    <div className="mt-3">
                                                        <div className="text-xs text-muted-foreground mb-1">
                                                            {t('completionRate')}: {module.completionRate}%
                                                        </div>
                                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary"
                                                                style={{ width: `${module.completionRate}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card>
                                        <div className="divide-y">
                                            {filteredModules.map((module) => (
                                                <div
                                                    key={module.id}
                                                    className="p-4 flex items-start gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => setSelectedModule(module.id)}
                                                >
                                                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                                                        {module.icon}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-medium">{t(module.title)}</h3>
                                                            {module.new && (
                                                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                                    {t('new')}
                                                                </Badge>
                                                            )}
                                                            {module.popular && (
                                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                                    {t('popular')}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <p className="text-sm text-muted-foreground mb-2">{t(module.description)}</p>

                                                        <div className="flex flex-wrap gap-2">
                                                            {getLevelBadge(module.level)}
                                                            <span className="text-xs flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full">
                                {getFormatIcon(module.format)}
                                                                {t(module.format)}
                              </span>
                                                            <span className="text-xs flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full">
                                <Clock className="h-3 w-3" />
                                                                {module.duration} {t('minutes')}
                              </span>
                                                        </div>
                                                    </div>

                                                    <div className="hidden sm:block text-right">
                                                        <div className="text-xs text-muted-foreground mb-1">
                                                            {t('completionRate')}: {module.completionRate}%
                                                        </div>
                                                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary"
                                                                style={{ width: `${module.completionRate}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="faq" className="space-y-4 mt-4">
                        <div className="relative mb-4">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t('searchFAQs')}
                                className="pl-8 w-full max-w-md h-9"
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('frequentlyAskedQuestions')}</CardTitle>
                                <CardDescription>{t('faqDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {faqs.filter(faq =>
                                        searchTerm === '' ||
                                        t(faq.question).toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        t(faq.answer).toLowerCase().includes(searchTerm.toLowerCase())
                                    ).length > 0 ? (
                                        <Accordion type="single" collapsible>
                                            {faqs
                                                .filter(faq =>
                                                    searchTerm === '' ||
                                                    t(faq.question).toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    t(faq.answer).toLowerCase().includes(searchTerm.toLowerCase())
                                                )
                                                .map((faq, index) => (
                                                    <AccordionItem key={index} value={`item-${index}`}>
                                                        <AccordionTrigger className="hover:no-underline">
                                                            {t(faq.question)}
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            <p className="text-muted-foreground">{t(faq.answer)}</p>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                        </Accordion>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                                <Search className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <h3 className="font-medium">{t('noFAQsFound')}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">{t('tryDifferentSearch')}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <div className="text-sm text-muted-foreground">
                                    {t('cantFindAnswer')} <a href="#" className="text-primary hover:underline">{t('contactSupport')}</a>
                                </div>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
};

export default Training;