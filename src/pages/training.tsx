import { JSX, SVGProps, useState} from 'react';
import Head from 'next/head';
import {AppLayout} from '@/components/layout/AppLayout';
import {useLanguage} from '@/i18n';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
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
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {Badge} from '@/components/ui/badge';
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
    Clock,
    Eye
} from 'lucide-react';
import {Label} from "@/components/ui/label";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";

//with PDF support
const trainingModules = [
    {
        id: 'integrated-training-manual',
        title: 'integratedTrainingManual',
        titleEn: 'INTEGRATED TRAINING MANUALS ON SOIL, CROP AND PEST MANAGEMENT',
        titleRw: 'Imfashanyigisho Kubutaka, Ibihigwa no Kurwanya Udukoko',
        description: 'integratedTrainingManualDesc',
        icon: <BookOpen className="h-6 w-6" />,
        level: 'allLevels',
        duration: 120,
        format: 'document',
        popular: false,
        new: false,
        pdfPath: '/GanzAfrica Booklet_English.pdf',
        pdfPathKinyarwanda: '/GanzAfrica Booklet_Kinyarwanda.pdf',
        image: '/Screensho.png'
    }
];

const faqs = [
    {
        question: 'faqQuestion1',
        answer: 'faqAnswer1'
    }
];

interface Module {
    id: string;
    title: string;
    titleEn: string;
    titleRw: string;
    description: string;
    icon: JSX.Element;
    level: string;
    duration: number;
    format: string;
    popular?: boolean;
    new?: boolean;
    pdfPath?: string;
    pdfPathKinyarwanda?: string;
    image?: string;
}

const Training = () => {
    const { t, locale } = useLanguage();
    const [view, setView] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [formatFilter, setFormatFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('modules');
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [currentPdfUrl, setCurrentPdfUrl] = useState('');

    const filteredModules = trainingModules.filter((module) => {
        const matchesSearch = searchTerm === '' ||
            t(module.title).toLowerCase().includes(searchTerm.toLowerCase()) ||
            t(module.description).toLowerCase().includes(searchTerm.toLowerCase());

        const matchesLevel = levelFilter === 'all' || module.level === levelFilter;
        const matchesFormat = formatFilter === 'all' || module.format === formatFilter;

        return matchesSearch && matchesLevel && matchesFormat;
    });

    const handleDownload = (module: Module) => {
        const pdfPath = locale === 'rw' && module.pdfPathKinyarwanda ? module.pdfPathKinyarwanda : module.pdfPath;
        if (pdfPath) {
            const link = document.createElement('a');
            link.href = encodeURI(pdfPath);
            link.download = pdfPath.split('/').pop() || 'training-manual.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleView = (module: Module) => {
        const pdfPath = locale === 'rw' && module.pdfPathKinyarwanda ? module.pdfPathKinyarwanda : module.pdfPath;
        if (pdfPath) {
            setCurrentPdfUrl(pdfPath);
            setShowPdfViewer(true);
        }
    };

    const getTitle = (module: Module) => {
        return locale === 'rw' ? module.titleRw : module.titleEn;
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

                {showPdfViewer ? (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">{getTitle(trainingModules[0])}</h3>
                                <Button variant="outline" size="sm" onClick={() => setShowPdfViewer(false)}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    {t('back')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full mb-3 flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">{t('pdfViewerHint')}</span>
                                <Button asChild variant="outline" size="sm">
                                    <a href={currentPdfUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3 mr-1" /> {t('openInNewTab')}
                                    </a>
                                </Button>
                            </div>
                            
                            <div className="w-full h-[800px] border rounded-lg overflow-hidden bg-gray-100">
                                <embed 
                                    src={currentPdfUrl}
                                    type="application/pdf" 
                                    width="100%" 
                                    height="100%"
                                    style={{ border: 'none' }}
                                />
                                <noscript>
                                    <div className="p-4 text-center">
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('pdfViewerNotSupported')}
                                        </p>
                                        <Button asChild variant="outline">
                                            <a href={currentPdfUrl} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                {t('clickHereToDownload')}
                                            </a>
                                        </Button>
                                    </div>
                                </noscript>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs defaultValue="modules" value={activeTab} onValueChange={setActiveTab}>
                            <TabsList>
                            <TabsTrigger
                                value="modules"
                                className="text-gray-700 hover:bg-blue-100 hover:text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                {t('trainingModules')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="faq"
                                style={{ display: 'none' }}
                                className="text-gray-700 hover:bg-blue-100 hover:text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
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
                                                            <SelectItem value="all-levels">{t('allLevels')}</SelectItem>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                                    {filteredModules.map((module) => (
                                        <Card key={module.id} className="transition-all duration-300 hover:shadow-lg border-blue-100 bg-white">
                                            <CardHeader className="pb-3">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="p-3 rounded-xl bg-blue-100 text-blue-600 shadow-sm">
                                                        {module.icon}
                                                    </div>
                                                </div>
                                                <CardTitle className="text-lg font-semibold text-gray-800 leading-tight">{getTitle(module)}</CardTitle>
                                                {module.image && (
                                                    <div className="mt-4 mb-3">
                                                        <img 
                                                            src={module.image} 
                                                            alt={getTitle(module)}
                                                            className="w-full h-56 object-contain rounded-lg shadow-sm"
                                                        />
                                                    </div>
                                                )}
                                                <CardDescription className="text-gray-600 leading-relaxed">{t(module.description)}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="pb-5 pt-2">
                                                {module.pdfPath && (
                                                    <div className="flex gap-3 mt-4">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                                                            onClick={() => handleView(module)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            {t('view')}
                                                        </Button>
                                                        <Button 
                                                            variant="primary"
                                                            size="sm" 
                                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                                            onClick={() => handleDownload(module)}
                                                        >
                                                            <Download className="h-4 w-4 mr-2" />
                                                            {t('download')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card className="border-blue-100 bg-white">
                                    <div className="divide-y divide-blue-100">
                                        {filteredModules.map((module) => (
                                            <div
                                                key={module.id}
                                                className="p-6 flex items-start gap-6 hover:bg-blue-25 transition-colors duration-200"
                                            >
                                                <div className="p-3 rounded-xl bg-blue-100 text-blue-600 shadow-sm">
                                                    {module.icon}
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <h3 className="font-semibold text-lg text-gray-800">{getTitle(module)}</h3>
                                                    </div>
                                                    
                                                    {module.image && (
                                                        <div className="mb-4">
                                                            <img 
                                                                src={module.image} 
                                                                alt={getTitle(module)}
                                                                className="w-full max-w-2xl h-40 object-contain rounded-lg shadow-sm"
                                                            />
                                                        </div>
                                                    )}

                                                    <p className="text-gray-600 mb-4 leading-relaxed">{t(module.description)}</p>
                                                </div>

                                                {module.pdfPath && (
                                                    <div className="flex gap-3">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                                                            onClick={() => handleView(module)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            {t('view')}
                                                        </Button>
                                                        <Button 
                                                            variant="primary"
                                                            size="sm"
                                                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                                            onClick={() => handleDownload(module)}
                                                        >
                                                            <Download className="h-4 w-4 mr-2" />
                                                            {t('download')}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </Card>
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
                )}
            </div>
        </AppLayout>
    );
};

export default Training;