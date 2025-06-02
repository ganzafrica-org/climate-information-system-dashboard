// src/pages/farmers.tsx
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
import { Archive, ArrowUpDown, ChevronDown, Download, Edit, Filter, MapPin, MessageSquare, MoreHorizontal, Phone, Plus, Search, Send, SlidersHorizontal, Trash, Upload, User, Users } from "lucide-react";

const musanzeSectors = ["Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi", "Muhoza", "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro"];

const farmersData = [
  {
    id: 1,
    name: "Jean Mugabo",
    location: "Kinigi",
    phone: "078XXXXXXX",
    crops: ["Maize", "Potatoes"],
    farmSize: 1.2,
    subscribedAlerts: ["Weather", "Planting"],
    lastActive: "2025-05-15T10:30:00",
  },
  {
    id: 2,
    name: "Marie Uwimana",
    location: "Muhoza",
    phone: "075XXXXXXX",
    crops: ["Beans", "Vegetables"],
    farmSize: 0.8,
    subscribedAlerts: ["Weather", "Pest"],
    lastActive: "2025-05-16T14:20:00",
  },
  {
    id: 3,
    name: "Emmanuel Habimana",
    location: "Gataraga",
    phone: "072XXXXXXX",
    crops: ["Maize", "Beans"],
    farmSize: 1.5,
    subscribedAlerts: ["Weather", "Planting", "Harvest"],
    lastActive: "2025-05-18T09:15:00",
  },
  {
    id: 4,
    name: "Claire Mukeshimana",
    location: "Cyuve",
    phone: "079XXXXXXX",
    crops: ["Potatoes", "Vegetables"],
    farmSize: 0.5,
    subscribedAlerts: ["Weather"],
    lastActive: "2025-05-17T16:45:00",
  },
  {
    id: 5,
    name: "Patrick Ndayisenga",
    location: "Busogo",
    phone: "073XXXXXXX",
    crops: ["Maize", "Potatoes", "Beans"],
    farmSize: 2.0,
    subscribedAlerts: ["Weather", "Planting", "Pest", "Harvest"],
    lastActive: "2025-05-18T11:30:00",
  },
  {
    id: 6,
    name: "Jeanette Murekatete",
    location: "Rwaza",
    phone: "078XXXXXXX",
    crops: ["Vegetables"],
    farmSize: 0.3,
    subscribedAlerts: ["Weather", "Pest"],
    lastActive: "2025-05-15T15:10:00",
  },
  {
    id: 7,
    name: "Bernard Niyonzima",
    location: "Muko",
    phone: "075XXXXXXX",
    crops: ["Maize", "Beans"],
    farmSize: 1.1,
    subscribedAlerts: ["Weather", "Planting"],
    lastActive: "2025-05-16T10:20:00",
  },
  {
    id: 8,
    name: "Francine Ingabire",
    location: "Nyange",
    phone: "072XXXXXXX",
    crops: ["Potatoes"],
    farmSize: 0.9,
    subscribedAlerts: ["Weather", "Harvest"],
    lastActive: "2025-05-17T14:05:00",
  },
];

const farmerGroups = [
  {
    id: 1,
    name: "Kinigi Cooperative",
    members: 32,
    sectors: ["Kinigi"],
    crops: ["Potatoes", "Maize"],
    coordinator: "Joseph Habimana",
  },
  {
    id: 2,
    name: "Muhoza Women Farmers",
    members: 18,
    sectors: ["Muhoza", "Cyuve"],
    crops: ["Beans", "Vegetables"],
    coordinator: "Christine Mukamana",
  },
  {
    id: 3,
    name: "Musanze Agricultural Association",
    members: 45,
    sectors: ["Musanze", "Gataraga", "Muko"],
    crops: ["Maize", "Beans", "Potatoes"],
    coordinator: "Robert Nshimiyimana",
  },
  {
    id: 4,
    name: "Rwaza Small Farmers",
    members: 15,
    sectors: ["Rwaza", "Remera"],
    crops: ["Vegetables"],
    coordinator: "Alice Mugwaneza",
  },
];

const Farmers: NextPage = () => {
  const { t } = useLanguage();
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedCrop, setSelectedCrop] = useState("all");
  const [farmersView, setFarmersView] = useState("individual");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState<number | null>(null);
  const [addingFarmer, setAddingFarmer] = useState(false);
  const filteredFarmers = farmersData.filter((farmer) => {
    const matchesSearch = searchTerm === "" || farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) || farmer.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSector = selectedSector === "all" || farmer.location === selectedSector;

    const matchesCrop = selectedCrop === "all" || farmer.crops.some((crop) => crop.toLowerCase() === selectedCrop.toLowerCase());

    return matchesSearch && matchesSector && matchesCrop;
  });

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
            <h2 className="text-lg font-medium">{t("musanzeRegion")}</h2>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2 h-9">
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
              <Input type="search" placeholder={t("searchFarmers")} className="pl-8 w-full sm:w-[180px] h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>{t("crop")}</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedCrop("all")}>{t("all")}</DropdownMenuItem>
                <Separator className="my-1" />
                {["Maize", "Potatoes", "Beans", "Vegetables"].map((crop) => (
                  <DropdownMenuItem key={crop} onClick={() => setSelectedCrop(crop)}>
                    {crop}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="primary" size="sm">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {t("moreFilters")}
            </Button>
          </div>
        </div>
        <Tabs defaultValue="individual" onValueChange={setFarmersView}>
          <TabsList>
            <TabsTrigger value="individual">
              <User className="h-4 w-4 mr-2" />
              {t("individualFarmers")}
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="h-4 w-4 mr-2" />
              {t("farmerGroups")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setAddingFarmer(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {farmersView === "individual" ? t("addFarmer") : t("addGroup")}
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            {t("importData")}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t("exportData")}
          </Button>
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            {t("sendMessage")}
          </Button>
        </div>

        {addingFarmer ? (
          <Card>
            <div className="flex justify-between items-center pr-6">
              <CardHeader>
                <CardTitle>{farmersView === "individual" ? t("addNewFarmer") : t("addNewGroup")}</CardTitle>
                <CardDescription>{farmersView === "individual" ? t("fillFarmerDetails") : t("fillNewGroupDetails")}</CardDescription>
              </CardHeader>
              <Button variant="outline" className="text-destructive" onClick={() => setAddingFarmer(false)}>
                {t("cancel")}
              </Button>
            </div>
            <CardContent>
              {/* Form for adding new farmer */}
              {farmersView === "individual" ? (
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t("farmerName")}</label>
                      <Input placeholder={t("enterfarmerName")} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        {t("phoneNumber")} <span className="text-destructive">*</span>
                      </label>
                      <Input placeholder="7XXXXXXXX" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">
                        {t("location")} <span className="text-red-500">*</span>
                      </label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-9 w-full justify-between">
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
                    <div>
                      <label className="text-sm font-medium">{t("farmSize")} (ha)</label>
                      <Input type="number" step="1" min="0" placeholder="1.0" />
                    </div>
                  </div>
                </form>
              ) : (
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t("groupName")}</label>
                      <Input placeholder={t("enterGroupName")} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        {t('coordinator')} <span className="text-destructive">*</span>
                      </label>
                      <Input placeholder={t("enterCoordinatorName")} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">
                        {t("location")} <span className="text-red-500">*</span>
                      </label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-9 w-full justify-between">
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
                    <div>
                      <label className="text-sm font-medium">{t("farmSize")} (ha)</label>
                      <Input type="number" step="1" min="0" placeholder="1.0" />
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
                          <div className="flex gap-2">
                            <Button variant="primary_outline">
                              <Archive className="h-4 w-4 mr-2" />
                              {t("saveAsDraft")}
                            </Button>
                            <Button variant="primary">
                              <Plus className="h-4 w-4" />
                              {farmersView === "individual" ? t("saveFarmerDetails") : t("saveGroupDetails")}
                            </Button>
                          </div>
                        </CardFooter>
          </Card>
        ) : (
          <>
            {farmersView === "individual" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle>{t("registeredFarmers")}</CardTitle>
                    <CardDescription>
                      {filteredFarmers.length} {t("farmersFound")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span>{t("name")}</span>
                                <ArrowUpDown className="h-3 w-3" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span>{t("location")}</span>
                                <ArrowUpDown className="h-3 w-3" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span>{t("crops")}</span>
                                <ArrowUpDown className="h-3 w-3" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span>{t("farmSize")}</span>
                                <ArrowUpDown className="h-3 w-3" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span>{t("alerts")}</span>
                                <ArrowUpDown className="h-3 w-3" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-right font-medium text-muted-foreground">{t("actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredFarmers.map((farmer) => (
                            <tr key={farmer.id} className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${selectedFarmer === farmer.id ? "bg-muted/50" : ""}`} onClick={() => setSelectedFarmer(farmer.id)}>
                              <td className="py-3 px-4">
                                <div className="font-medium">{farmer.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {farmer.phone}
                                </div>
                              </td>
                              <td className="py-3 px-4">{farmer.location}</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {farmer.crops.map((crop, index) => (
                                    <div key={index} className="text-xs bg-muted rounded-full px-2 py-0.5">
                                      {crop}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4">{farmer.farmSize} ha</td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {farmer.subscribedAlerts.map((alert, index) => (
                                    <div key={index} className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full px-2 py-0.5">
                                      {alert}
                                    </div>
                                  ))}
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
                                      <User className="h-4 w-4 mr-2" />
                                      {t("viewProfile")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Edit className="h-4 w-4 mr-2" />
                                      {t("editFarmer")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      {t("sendMessage")}
                                    </DropdownMenuItem>
                                    <Separator className="my-1" />
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash className="h-4 w-4 mr-2" />
                                      {t("delete")}
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
                      {t("showing")} {filteredFarmers.length} {t("of")} {farmersData.length} {t("farmers")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled>
                        {t("previous")}
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        {t("next")}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
                {selectedFarmer && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("farmerProfile")}</CardTitle>
                      <CardDescription>{t("farmerDetails")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(() => {
                        const farmer = farmersData.find((f) => f.id === selectedFarmer);
                        if (!farmer) return null;

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="flex items-center gap-4 mb-4">
                                <div className="bg-muted rounded-full h-16 w-16 flex items-center justify-center">
                                  <User className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold">{farmer.name}</h3>
                                  <p className="text-muted-foreground">{farmer.location}</p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="text-sm font-medium">{t("phoneNumber")}</div>
                                  <div className="col-span-2">{farmer.phone}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="text-sm font-medium">{t("farmSize")}</div>
                                  <div className="col-span-2">{farmer.farmSize} ha</div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="text-sm font-medium">{t("lastActive")}</div>
                                  <div className="col-span-2">{new Date(farmer.lastActive).toLocaleString()}</div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <h3 className="font-medium mb-2">{t("cropsGrown")}</h3>
                                <div className="flex flex-wrap gap-2">
                                  {farmer.crops.map((crop, index) => (
                                    <div key={index} className="bg-muted rounded-md px-3 py-1 text-sm">
                                      {crop}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h3 className="font-medium mb-2">{t("subscribedAlerts")}</h3>
                                <div className="flex flex-wrap gap-2">
                                  {farmer.subscribedAlerts.map((alert, index) => (
                                    <div key={index} className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-md px-3 py-1 text-sm">
                                      {alert}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h3 className="font-medium mb-2">{t("recentActivity")}</h3>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-start gap-2">
                                    <div className="rounded-full bg-blue-500 h-2 w-2 mt-1.5" />
                                    <span>
                                      {t("receivedWeatherAlert")} - {new Date(farmer.lastActive).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <div className="rounded-full bg-green-500 h-2 w-2 mt-1.5" />
                                    <span>
                                      {t("updatedCropInfo")} - {new Date(farmer.lastActive).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                    <CardFooter className="flex gap-2 justify-end">
                      <Button variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        {t("editProfile")}
                      </Button>
                      <Button>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t("sendMessage")}
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </div>
            )}

            {farmersView === "groups" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {farmerGroups.map((group) => (
                  <Card key={group.id}>
                    <CardHeader>
                      <div className="flex justify-between">
                        <CardTitle>{group.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Users className="h-4 w-4 mr-2" />
                              {t("viewMembers")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("editGroup")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {t("messageGroup")}
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            <DropdownMenuItem className="text-red-600">
                              <Trash className="h-4 w-4 mr-2" />
                              {t("deleteGroup")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription>
                        {group.members} {t("members")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">{t("sectors")}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.sectors.map((sector) => (
                            <div key={sector} className="bg-muted rounded-md px-2 py-0.5 text-xs">
                              {sector}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-1">{t("crops")}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.crops.map((crop) => (
                            <div key={crop} className="bg-muted rounded-md px-2 py-0.5 text-xs">
                              {crop}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-1">{t("coordinator")}</div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{group.coordinator}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        <Users className="h-4 w-4 mr-2" />
                        {t("manageMembers")}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                <Card className="flex flex-col items-center justify-center min-h-[200px] border-dashed cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium">{t("createNewGroup")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t("createNewGroupDesc")}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("farmersAnalytics")}</CardTitle>
            <CardDescription>{t("farmersAnalyticsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">{t("sectorDistribution")}</h3>
                <div className="space-y-2">
                  {["Kinigi", "Muhoza", "Gataraga", "Cyuve", "Other"].map((sector, index) => {
                    const percentage = index === 0 ? 25 : index === 1 ? 20 : index === 2 ? 15 : index === 3 ? 15 : 25;
                    return (
                      <div key={sector}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{sector}</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-ganz-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">{t("cropDistribution")}</h3>
                <div className="space-y-2">
                  {["Maize", "Potatoes", "Beans", "Vegetables"].map((crop, index) => {
                    const percentage = index === 0 ? 40 : index === 1 ? 30 : index === 2 ? 20 : 10;
                    return (
                      <div key={crop}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{crop}</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-ganz-secondary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">{t("farmSize")}</h3>
                <div className="space-y-2">
                  {[
                    { range: "< 0.5 ha", percentage: 25 },
                    { range: "0.5 - 1 ha", percentage: 40 },
                    { range: "1 - 2 ha", percentage: 25 },
                    { range: "> 2 ha", percentage: 10 },
                  ].map((item) => (
                    <div key={item.range}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.range}</span>
                        <span>{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-ganz-accent h-2 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              {t("downloadAnalytics")}
            </Button>
          </CardFooter>
        </Card>

        <div className="text-xs text-muted-foreground text-center mt-4">
          {t("dataLastUpdated")}: {new Date().toLocaleString()}
        </div>
      </div>
    </AppLayout>
  );
};

export default Farmers;
