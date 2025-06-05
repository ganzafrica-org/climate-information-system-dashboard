import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from '@/components/ui/accordion';
import {
    BookOpen,
    FileIcon,
    HelpCircle,
    Send
} from 'lucide-react';

const Help: NextPage = () => {
    const { t } = useLanguage();

    return (
        <AppLayout>
            <Head>
                <title>{t('help')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-ganz-primary" />
                    <h2 className="text-xl font-medium">{t('help')}</h2>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('help')}</CardTitle>
                        <CardDescription>{t('helpAndSupportDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-base font-medium">{t('frequentlyAskedQuestions')}</h3>

                            <Accordion type="single" collapsible className="w-full">
                                {[
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
                                    }
                                ].map((faq, index) => (
                                    <AccordionItem key={index} value={`item-${index}`}>
                                        <AccordionTrigger>
                                            {t(faq.question)}
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-sm text-muted-foreground">
                                                {t(faq.answer)}
                                            </p>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <h3 className="text-base font-medium">{t('userManual')}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                {t('userManualDesc')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline">
                                    <FileIcon className="h-4 w-4 mr-2" />
                                    {t('downloadUserManual')}
                                </Button>
                                <Button variant="outline">
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    {t('viewOnlineDocumentation')}
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <h3 className="text-base font-medium">{t('contactSupport')}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                {t('contactSupportDesc')}
                            </p>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('name')}</label>
                                        <Input placeholder={t('yourName')} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('email')}</label>
                                        <Input placeholder={t('yourEmail')} />
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label className="text-sm font-medium">{t('subject')}</label>
                                        <Input placeholder={t('subject')} />
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label className="text-sm font-medium">{t('message')}</label>
                                        <textarea
                                            className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            placeholder={t('describeYourIssue')}
                                        ></textarea>
                                    </div>
                                </div>
                                <Button>
                                    <Send className="h-4 w-4 mr-2" />
                                    {t('sendMessage')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground text-center mt-4">
                    © 2025 GanzAfrica. {t('allRightsReserved')}
                </div>
            </div>
        </AppLayout>
    );
};

export default Help;