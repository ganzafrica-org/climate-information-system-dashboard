import React, { useState } from 'react';
import { AlertsTable } from '@/components/communications/AlertsTable';
import { MessagesTable } from '@/components/communications/MessagesTable';
import { AlertTriangle, MessageSquare, Bell, Plus, Filter, Search, MapPin, ChevronDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import Head from 'next/head';
import { useLanguage } from '@/i18n';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const musanzeSectors = ["Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi", "Muhoza", "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro"];

export default function Communications() {
  const [activeTab, setActiveTab] = useState("alerts");
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { t } = useLanguage();
  
  return (
    <AppLayout>
        <Head>
            <title> 
                {t("farmers")} | {t("climateInformationSystem")}
            </title>
        </Head>

        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-ganz-primary" />
                        <h2 className="text-lg font-medium">{t("Agricultural Alerts & Messages")}</h2>
            
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-2 h-9">
                              <span>{selectedSector === "all" ? t("selectRegion") : selectedSector}</span>
                              <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedSector("all")}>{t("all")}</DropdownMenuItem>
                            <Separator className="my-1" />
                            {musanzeSectors.map((sector) => (
                              <DropdownMenuItem key={sector} onClick={() => setSelectedSector(sector)}>
                                {sector}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
            
                      <div className="flex w-full sm:w-auto items-center gap-2">
                        <div className="relative w-full sm:w-auto">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="search" placeholder={t("searchMessages")} className="pl-8 w-full sm:w-[180px] h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                      </div>
            </div>
            <Tabs defaultValue="alerts" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="alerts">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {t("alerts")}
                    </TabsTrigger>
                    <TabsTrigger value="messages">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t("customMessages")}
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Tab Content */}
                <div className="transition-all duration-300 ease-in-out">
                    {activeTab === 'alerts' ? (
                        <AlertsTable selectedSector={selectedSector} searchTerm={searchTerm} />
                    ) : (
                        <MessagesTable selectedSector={selectedSector} searchTerm={searchTerm} />
                    )}
                </div>
        </div>
    
    </AppLayout>
  );
}

