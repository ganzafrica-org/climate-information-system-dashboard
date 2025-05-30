import { useState } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, AlertTriangle, Bell, BellOff, Check, ChevronDown, CloudRain, Filter, Info, ListFilter, MapPin, MessageSquare, Search, Send, Settings, Share2, Trash, Mail, X } from "lucide-react";

const musanzeSectors = ["Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi", "Muhoza", "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro"];

const activeAlerts = [
  {
    id: "alert-001",
    type: "heavyRainAlert",
    severity: "warning",
    message: "heavyRainWarning",
    sectors: ["Kinigi", "Nyange", "Shingiro"],
    issueDate: "2025-05-18T10:30:00",
    validUntil: "2025-05-19T23:59:00",
    icon: <CloudRain />,
    color: "amber",
  },
  {
    id: "alert-002",
    type: "floodRiskAlert",
    severity: "high",
    message: "floodRiskWarning",
    sectors: ["Cyuve", "Musanze"],
    issueDate: "2025-05-18T14:00:00",
    validUntil: "2025-05-20T18:00:00",
    icon: <AlertTriangle />,
    color: "red",
  },
  {
    id: "alert-003",
    type: "optimalPlantingAlert",
    severity: "info",
    message: "optimalPlantingMessage",
    sectors: ["Busogo", "Muko", "Rwaza"],
    issueDate: "2025-05-18T08:15:00",
    validUntil: "2025-05-22T23:59:00",
    icon: <Info />,
    color: "green",
  },
  {
    id: "alert-004",
    type: "pestRiskAlert",
    severity: "warning",
    message: "pestRiskMessage",
    sectors: ["Gacaca", "Gashaki", "Remera"],
    issueDate: "2025-05-17T16:45:00",
    validUntil: "2025-05-24T23:59:00",
    icon: <AlertCircle />,
    color: "amber",
  },
];

// Sample past alerts
const pastAlerts = [
  {
    id: "alert-p001",
    type: "heavyRainAlert",
    severity: "warning",
    message: "heavyRainWarning",
    sectors: ["Kinigi", "Gataraga"],
    issueDate: "2025-05-10T12:30:00",
    validUntil: "2025-05-11T23:59:00",
    icon: <CloudRain />,
    color: "amber",
  },
  {
    id: "alert-p002",
    type: "irrigationNeeded",
    severity: "info",
    message: "irrigationMessage",
    sectors: ["All sectors"],
    issueDate: "2025-05-05T09:00:00",
    validUntil: "2025-05-12T23:59:00",
    icon: <Info />,
    color: "blue",
  },
  {
    id: "alert-p003",
    type: "diseaseRiskAlert",
    severity: "high",
    message: "diseaseRiskMessage",
    sectors: ["Busogo", "Cyuve", "Muhoza"],
    issueDate: "2025-04-28T14:30:00",
    validUntil: "2025-05-05T23:59:00",
    icon: <AlertTriangle />,
    color: "red",
  },
];

// Sample alert categories
const alertCategories = [
  { id: "weather", name: "weatherAlerts" },
  { id: "planting", name: "plantingAdvisories" },
  { id: "pest", name: "pestAndDiseaseAlerts" },
  { id: "harvest", name: "harvestAdvisories" },
];

// Sample crops for filtering
const crops = [
  { id: "maize", name: "maize", icon: "🌽" },
  { id: "beans", name: "beans", icon: "🌱" },
  { id: "potatoes", name: "potatoes", icon: "🥔" },
  { id: "vegetables", name: "vegetables", icon: "🥬" },
];

const Alerts: NextPage = () => {
  const { t } = useLanguage();
  const [selectedSector, setSelectedSector] = useState("all");
  const [, setSelectedCategory] = useState("all");
  const [alertView, setAlertView] = useState("active"); // 'active' or 'past'
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const renderAlertCard = (alert: (typeof activeAlerts)[0], index: number) => {
    return (
      <Card key={alert.id} className={`cursor-pointer transition-colors ${selectedAlert === alert.id ? "border-primary shadow-md" : ""}`} onClick={() => setSelectedAlert(alert.id)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`
              rounded-full p-2 flex-shrink-0
              ${alert.color === "amber" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : alert.color === "red" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : alert.color === "green" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"}
            `}
            >
              {alert.icon}
            </div>

            <div className="flex-1">
              <h3 className="font-medium">{t(alert.type)}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t(alert.message)}</p>

              <div className="flex flex-wrap gap-2 mt-2">
                {alert.sectors.map((sector) => (
                  <div key={sector} className="text-xs bg-muted rounded-full px-2 py-0.5">
                    {sector}
                  </div>
                ))}
              </div>

              <div className="flex flex-col justify-start mt-3 text-sm text-muted-foreground gap-y-1">
                <div className="flex font-medium text-blue-500">
                  {t("issued")}: {new Date(alert.issueDate).toLocaleString()}
                </div>
                <div className="flex font-medium text-green-700">
                  {/* <Bell size={12} className="mr-1" /> */}
                  {alertView === "active" ? t("activeUntil") : t("wasActiveUntil")}: {new Date(alert.validUntil).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <Head>
        <title>
          {t("alerts")} | {t("climateInformationSystem")}
        </title>
      </Head>

      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 md:pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-ganz-primary" />
            <h2 className="text-lg font-medium">{t("musanzeRegion")}</h2>

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

          <div className="flex flex-wrap w-full sm:w-auto items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder={t("searchAlerts")} className="pl-8 w-full sm:w-[180px] h-9" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">
                  <ListFilter className="mr-2 h-4 w-4" />
                  <span>{t("category")}</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedCategory("all")}>{t("all")}</DropdownMenuItem>
                <Separator className="my-1" />
                {alertCategories.map((category) => (
                  <DropdownMenuItem key={category.id} onClick={() => setSelectedCategory(category.id)}>
                    {t(category.name)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="primary" className=" h-9">
              <Filter className="mr-2 h-4 w-4" />
              {t("filter")}
            </Button>
          </div>
        </div>
        <Tabs defaultValue="active" onValueChange={setAlertView}>
          <TabsList>
            <TabsTrigger value="active">
              <Bell className="h-4 w-4 mr-2" />
              {t("activeAlerts")}
            </TabsTrigger>
            <TabsTrigger value="past">
              <BellOff className="h-4 w-4 mr-2" />
              {t("pastAlerts")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            {alertView === "active" ? (
              activeAlerts.length > 0 ? (
                activeAlerts.map((alert, index) => renderAlertCard(alert, index))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Bell className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium">{t("noActiveAlerts")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t("noActiveAlertsMessage")}</p>
                  </CardContent>
                </Card>
              )
            ) : pastAlerts.length > 0 ? (
              pastAlerts.map((alert, index) => renderAlertCard(alert, index))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BellOff className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">{t("noPastAlerts")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t("noPastAlertsMessage")}</p>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="lg:col-span-2">
            {selectedAlert ? (
              (() => {
                const alertsList = alertView === "active" ? activeAlerts : pastAlerts;
                const alert = alertsList.find((a) => a.id === selectedAlert);

                if (!alert) return null;

                return (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between">
                        <CardTitle>{t(alert.type)}</CardTitle>
                        <div className="flex space-x-2">
                          {alertView === "active" && (
                            <Button variant="primary_outline" className="h-9">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {t("sendMessage")}
                            </Button>
                          )}
                          <Button variant="primary" className="h-9">
                            <Share2 className="h-4 w-4 mr-2" />
                            {t("share")}
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-sm text-blue-600">
                        {t("issued")}: {new Date(alert.issueDate).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div
                        className={`
                        rounded-md p-4
                        ${alert.color === "amber" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : alert.color === "red" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : alert.color === "green" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"}
                      `}
                      >
                        <div className="flex gap-3">
                          <div className="h-6 w-6 flex-shrink-0 mt-0.5">{alert.icon}</div>
                          <div>
                            <h3 className="font-semibold mb-2">{t("alertDetails")}</h3>
                            <p>{t(alert.message)}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-md mb-3">{t("affectedAreas")}</h3>
                        <div className="flex flex-wrap gap-2 ml-3">
                          {alert.sectors.map((sector) => (
                            <div key={sector} className="bg-muted rounded-md px-3 py-1 text-sm">
                              {sector}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-md mb-3">{t("recommendedActions")}</h3>
                        <div className="space-y-3 ml-3 text-md">
                          {alert.type === "heavyRainAlert" && (
                            <>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("heavyRainAction1")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("heavyRainAction2")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <X className="h-5 w-5 text-red-600 mt-0.5" />
                                <p>{t("heavyRainAvoid1")}</p>
                              </div>
                            </>
                          )}

                          {alert.type === "floodRiskAlert" && (
                            <>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("floodRiskAction1")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("floodRiskAction2")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <X className="h-5 w-5 text-red-600 mt-0.5" />
                                <p>{t("floodRiskAvoid1")}</p>
                              </div>
                            </>
                          )}

                          {alert.type === "optimalPlantingAlert" && (
                            <>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("optimalPlantingAction1")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("optimalPlantingAction2")}</p>
                              </div>
                            </>
                          )}

                          {alert.type === "pestRiskAlert" && (
                            <>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("pestRiskAction1")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("pestRiskAction2")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("pestRiskAction3")}</p>
                              </div>
                            </>
                          )}

                          {alert.type === "irrigationNeeded" && (
                            <>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("irrigationAction1")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("irrigationAction2")}</p>
                              </div>
                            </>
                          )}

                          {alert.type === "diseaseRiskAlert" && (
                            <>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("diseaseRiskAction1")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                                <p>{t("diseaseRiskAction2")}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <X className="h-5 w-5 text-red-600 mt-0.5" />
                                <p>{t("diseaseRiskAvoid1")}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-md mb-3">{t("timeframe")}</h3>
                        <div className="flex items-center gap-2 text-sm ml-3">
                          <div className="bg-muted rounded-md px-3 py-1">
                            {t("start")}: {new Date(alert.issueDate).toLocaleString()}
                          </div>
                          <span>→</span>
                          <div className="bg-muted rounded-md px-3 py-1">
                            {t("end")}: {new Date(alert.validUntil).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      {alertView === "active" ? (
                        <>
                          <Button variant="outline" className="text-red-600">
                            <BellOff className="h-4 w-4 mr-2" />
                            {t("muteAlert")}
                          </Button>
                          <Button variant="primary">
                            <Settings className="h-4 w-4 mr-2" />
                            {t("manageNotifications")}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" className="text-red-600">
                            <Trash className="h-4 w-4 mr-2" />
                            {t("deleteFromHistory")}
                          </Button>
                          <Button variant="default">
                            <Send className="h-4 w-4 mr-2" />
                            {t("resendAlert")}
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                );
              })()
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg">{t("selectAnAlert")}</h3>
                  <p className="text-muted-foreground mt-2">{t("selectAnAlertMessage")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("alertNotificationSettings")}</CardTitle>
            <CardDescription>{t("alertNotificationSettingsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium">{t("notificationChannels")}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{t("sms")}</span>
                  </div>
                  <div className="flex items-center h-4">
                    <div className="h-3 w-6 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span>{t("mobilePush")}</span>
                  </div>
                  <div className="flex items-center h-4">
                    <div className="h-3 w-6 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{t("email")}</span>
                  </div>
                  <div className="flex items-center h-4">
                    <div className="h-3 w-6 bg-muted rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">{t("alertCategories")}</h3>
                {alertCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between">
                    <span>{t(category.name)}</span>
                    <div className="flex items-center h-4">
                      <div className={`h-3 w-6 ${category.id === "weather" || category.id === "pest" ? "bg-green-500" : "bg-muted"} rounded-full`}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">{t("cropSpecificAlerts")}</h3>
                {crops.map((crop) => (
                  <div key={crop.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{crop.icon}</span>
                      <span>{t(crop.name)}</span>
                    </div>
                    <div className="flex items-center h-4">
                      <div className={`h-3 w-6 ${crop.id === "maize" || crop.id === "potatoes" ? "bg-green-500" : "bg-muted"} rounded-full`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="ml-auto">
              <Settings className="h-4 w-4 mr-2" />
              {t("manageSettings")}
            </Button>
          </CardFooter>
        </Card>

        <div className="text-xs text-muted-foreground text-center mt-4">
          {t("alertsLastUpdated")}: {new Date().toLocaleString()}
        </div>
      </div>
    </AppLayout>
  );
};

export default Alerts;
