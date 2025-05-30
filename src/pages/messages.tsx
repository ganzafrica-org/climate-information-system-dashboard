import { useState } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Archive, Calendar, Check, ChevronDown, Clock, Edit, Filter, Heading, MapPin, MessageSquare, MoreHorizontal, Pencil, Pin, PlusCircle, Search, Send, TextSelect, Trash, Users } from "lucide-react";

const musanzeSectors = ["Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi", "Muhoza", "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro"];

const messageTemplates = [
  {
    id: 1,
    title: "Heavy Rainfall Alert",
    content: "Attention farmers in {{sector}}. Heavy rainfall (>25mm) expected in the next 24 hours. Please protect seedlings, delay fertilizer application, and ensure proper field drainage.",
    tags: ["Weather", "Alert", "Rainfall"],
  },
  {
    id: 2,
    title: "Optimal Planting Conditions",
    content: "Good news for {{sector}} farmers! Optimal planting conditions for the next 48 hours. Soil moisture and temperatures are favorable for planting {{crop}}.",
    tags: ["Planting", "Advisory"],
  },
  {
    id: 3,
    title: "Pest Control Reminder",
    content: "Reminder for {{crop}} farmers in {{sector}}: Current weather conditions increase risk of pests. Monitor your crops closely and apply appropriate preventative measures.",
    tags: ["Pest", "Advisory"],
  },
  {
    id: 4,
    title: "Irrigation Needed",
    content: "Attention farmers in {{sector}}. No significant rainfall expected for the next 7 days. Please schedule irrigation for your {{crop}}, especially for newly planted areas.",
    tags: ["Drought", "Advisory", "Irrigation"],
  },
  {
    id: 5,
    title: "Fertilizer Application",
    content: "Advisory for {{sector}} farmers: Good conditions for fertilizer application in the next 3 days for {{crop}}. Follow recommended amounts based on your soil test results.",
    tags: ["Fertilizer", "Advisory"],
  },
];

const sentMessages = [
  {
    id: 1,
    title: "Heavy Rainfall Alert",
    content: "Attention farmers in Kinigi. Heavy rainfall (>25mm) expected in the next 24 hours. Please protect seedlings, delay fertilizer application, and ensure proper field drainage.",
    recipients: "Kinigi farmers (32 recipients)",
    sentAt: "2025-05-18T10:30:00",
    status: "Delivered",
  },
  {
    id: 2,
    title: "Pest Control Alert",
    content: "Attention maize farmers in Muhoza and Cyuve. Current warm and humid conditions increase risk of army worm. Monitor your crops and prepare control measures.",
    recipients: "Maize farmers in Muhoza, Cyuve (45 recipients)",
    sentAt: "2025-05-16T14:20:00",
    status: "Delivered",
  },
  {
    id: 3,
    title: "Optimal Planting Conditions",
    content: "Good news for Gataraga farmers! Optimal planting conditions for the next 48 hours. Soil moisture and temperatures are favorable for planting beans.",
    recipients: "Gataraga farmers (28 recipients)",
    sentAt: "2025-05-15T09:15:00",
    status: "Delivered",
  },
  {
    id: 4,
    title: "Season B Planning Meeting",
    content: "Reminder: Season B planning meeting for all farmer group coordinators will be held on May 20th at the Musanze Agricultural Center. Bring your production estimates.",
    recipients: "All coordinators (12 recipients)",
    sentAt: "2025-05-13T16:45:00",
    status: "Delivered",
  },
];

const scheduledMessages = [
  {
    id: 1,
    title: "Irrigation Reminder",
    content: "Reminder for vegetable farmers in Cyuve and Rwaza. Schedule irrigation for your crops this week. No rainfall expected for the next 5 days.",
    recipients: "Vegetable farmers in Cyuve, Rwaza (23 recipients)",
    scheduledFor: "2025-05-20T07:00:00",
  },
  {
    id: 2,
    title: "Fertilizer Application",
    content: "Advisory for Kinigi farmers: Good conditions for fertilizer application in the next 3 days for potatoes. Follow recommended amounts based on your soil test results.",
    recipients: "Kinigi potato farmers (18 recipients)",
    scheduledFor: "2025-05-21T07:00:00",
  },
];

const Messages: NextPage = () => {
  const { t } = useLanguage();
  const [selectedSector, setSelectedSector] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [messageView, setMessageView] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [composingMessage, setComposingMessage] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageTitle, setMessageTitle] = useState("");

  const handleSelectTemplate = (templateId: number) => {
    const template = messageTemplates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setMessageTitle(template.title);
      setMessageContent(template.content);
      setComposingMessage(true);
    }
  };

  const filteredTemplates = messageTemplates.filter((template) => searchTerm === "" || template.title.toLowerCase().includes(searchTerm.toLowerCase()) || template.content.toLowerCase().includes(searchTerm.toLowerCase()) || template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <AppLayout>
      <Head>
        <title>
          {t("messages")} | {t("climateInformationSystem")}
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

          <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder={t("searchMessages")} className="pl-8 w-full sm:w-[180px] h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            <Button variant="primary" className="h-9">
              <Filter className="h-4 w-4" />
              {t("filter")}
            </Button>
          </div>
        </div>
        <Tabs defaultValue="templates" onValueChange={setMessageView}>
          <TabsList>
            <TabsTrigger value="templates">
              <TextSelect className="h-4 w-4 mr-2" />
              {t("messageTemplates")}
            </TabsTrigger>
            <TabsTrigger value="sent">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t("sentMessages")}
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <Calendar className="h-4 w-4 mr-2" />
              {t("scheduledMessages")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setComposingMessage(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            {t("composeMessage")}
          </Button>
          <Button variant="primary_outline">
            <PlusCircle className="h-4 w-4 mr-2" />
            {t("newTemplate")}
          </Button>
        </div>

        {composingMessage ? (
          <Card>
            <div className="flex justify-between items-center pr-6">
              <CardHeader>
                <CardTitle>{t("composeMessage")}</CardTitle>
                <CardDescription>{t("composeMessageDesc")}</CardDescription>
              </CardHeader>
              <Button variant="outline" onClick={() => setComposingMessage(false)} className="text-destructive">
                {t("cancel")}
              </Button>
            </div>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("messageTitle")}</label>
                <Input placeholder={t("enterMessageTitle")} value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("messageContent")}</label>
                <div className="border rounded-md overflow-hidden">
                  <div className="flex items-center bg-muted p-2 gap-2">
                    <Button variant="ghost" size="sm">
                      <Heading className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <TextSelect className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Pin className="h-4 w-4" />
                    </Button>
                  </div>
                  <textarea className="w-full min-h-[150px] p-3 bg-background border-0 focus:outline-none placeholder:text-sm placeholder:text-muted-foreground resize-none" placeholder={t("enterMessageContent")} value={messageContent} onChange={(e) => setMessageContent(e.target.value)} />
                </div>
                <div className="text-xs text-muted-foreground">{t("messageVariablesInfo")}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("recipients")}</label>
                <div className="flex items-center border rounded-md p-3">
                  <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-6">
                        <span>{t("selectRecipients")}</span>
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>{t("allFarmers")}</DropdownMenuItem>
                      <DropdownMenuItem>{t("sectorSpecific")}</DropdownMenuItem>
                      <DropdownMenuItem>{t("cropSpecific")}</DropdownMenuItem>
                      <DropdownMenuItem>{t("farmerGroups")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("sendingOptions")}</label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input type="radio" id="send-now" name="sending-option" defaultChecked />
                    <label htmlFor="send-now" className="text-sm">
                      {t("sendNow")}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" id="schedule" name="sending-option" />
                    <label htmlFor="schedule" className="text-sm">
                      {t("schedule")}
                    </label>
                    <Button variant="outline" className="h-9" disabled>
                      <Calendar className="h-4 w-4 mr-2" />
                      {t("selectDateTime")}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <div className="flex gap-2">
                <Button variant="primary_outline">
                  <Archive className="h-4 w-4 mr-2" />
                  {t("saveAsDraft")}
                </Button>
                <Button variant="primary">
                  <Send className="h-4 w-4 mr-2" />
                  {t("sendMessage")}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ) : (
          <>
            {messageView === "templates" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className={`cursor-pointer ${selectedTemplate === template.id ? "border-primary" : ""}`} onClick={() => setSelectedTemplate(template.id)}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-base">{template.title}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSelectTemplate(template.id)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {t("useTemplate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("editTemplate")}
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            <DropdownMenuItem className="text-red-600">
                              <Trash className="h-4 w-4 mr-2" />
                              {t("deleteTemplate")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="py-0">
                      <p className="text-sm text-muted-foreground line-clamp-4">{template.content}</p>
                    </CardContent>
                    <CardFooter className="pt-4 pb-2">
                      <div className="flex flex-wrap gap-1 w-full">
                        {template.tags.map((tag, index) => (
                          <div key={index} className="text-xs bg-muted rounded-full px-2 py-1">
                            {tag}
                          </div>
                        ))}
                      </div>
                    </CardFooter>
                  </Card>
                ))}

                <Card className="flex flex-col items-center justify-center min-h-[150px] border-dashed cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <PlusCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium">{t("createTemplate")}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t("createTemplateDesc")}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {messageView === "sent" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("sentMessages")}</CardTitle>
                  <CardDescription>{t("recentMessagesSent")}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted">
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">{t("title")}</th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">{t("recipients")}</th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">{t("sentDate")}</th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">{t("status")}</th>
                          <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sentMessages.map((message) => (
                          <tr key={message.id} className="border-b hover:bg-muted/50 cursor-pointer">
                            <td className="py-3 px-4">
                              <div className="font-medium text-sm">{message.title}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{message.content}</div>
                            </td>
                            <td className="py-3 px-4 text-sm">{message.recipients}</td>
                            <td className="py-3 px-4 text-sm">{new Date(message.sentAt).toLocaleString()}</td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-green-800">
                                <Check className="h-4 w-4 " />
                                <span className="text-sm">{message.status}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    {t("viewMessage")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    {t("resendMessage")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t("saveAsTemplate")}
                                  </DropdownMenuItem>
                                  <Separator className="my-1" />
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash className="h-4 w-4 mr-2" />
                                    {t("deleteMessage")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
                <CardFooter className="p-4 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {sentMessages.length} {t("messagesSent")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="primary_outline" size="sm" disabled>
                      {t("previous")}
                    </Button>
                    <Button variant="primary_outline" size="sm" disabled>
                      {t("next")}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
            {messageView === "scheduled" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("scheduledMessages")}</CardTitle>
                  <CardDescription>{t("upcomingMessages")}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted">
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">{t("title")}</th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">{t("recipients")}</th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">{t("scheduledFor")}</th>
                          <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduledMessages.map((message) => (
                          <tr key={message.id} className="border-b hover:bg-muted/50 cursor-pointer">
                            <td className="py-3 px-4 text-sm">
                              <div className="font-medium">{message.title}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{message.content}</div>
                            </td>
                            <td className="py-3 px-4 text-sm">{message.recipients}</td>
                            <td className="py-3 px-4 text-sm">{new Date(message.scheduledFor).toLocaleString()}
                              {/* <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span>{new Date(message.scheduledFor).toLocaleString()}</span>
                              </div> */}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    {t("viewMessage")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t("editSchedule")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    {t("sendNow")}
                                  </DropdownMenuItem>
                                  <Separator className="my-1" />
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash className="h-4 w-4 mr-2" />
                                    {t("cancelScheduled")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
                <CardFooter className="p-4 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {scheduledMessages.length} {t("messagesScheduled")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="primary_outline" size="sm" disabled>
                      {t("previous")}
                    </Button>
                    <Button variant="primary_outline" size="sm" disabled>
                      {t("next")}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("messagingAnalytics")}</CardTitle>
            <CardDescription>{t("messagingAnalyticsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">{t("messageDelivery")}</h3>
                <div className="space-y-2">
                  {[
                    { status: "delivered", percentage: 95 },
                    { status: "pending", percentage: 3 },
                    { status: "failed", percentage: 2 },
                  ].map((item) => (
                    <div key={item.status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{t(item.status)}</span>
                        <span>{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`h-2 rounded-full ${item.status === "delivered" ? "bg-green-500" : item.status === "pending" ? "bg-blue-500" : "bg-red-500"}`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">{t("messageTypesUsed")}</h3>
                <div className="space-y-2">
                  {[
                    { type: "weather", percentage: 55 },
                    { type: "planting", percentage: 20 },
                    { type: "pest", percentage: 15 },
                    { type: "harvest", percentage: 10 },
                  ].map((item) => (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{t(`${item.type}Alerts`)}</span>
                        <span>{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-ganz-primary h-2 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">{t("topRecipientGroups")}</h3>
                <div className="space-y-2">
                  {[
                    { group: "Kinigi farmers", percentage: 30 },
                    { group: "Maize farmers", percentage: 25 },
                    { group: "Potato farmers", percentage: 20 },
                    { group: "Farmer cooperatives", percentage: 15 },
                    { group: "Other groups", percentage: 10 },
                  ].map((item) => (
                    <div key={item.group}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.group}</span>
                        <span>{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-ganz-secondary h-2 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground text-center mt-4">
          {t("dataLastUpdated")}: {new Date().toLocaleString()}
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
