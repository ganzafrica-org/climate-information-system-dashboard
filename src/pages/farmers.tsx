import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  Download, Edit, Filter,
  MoreHorizontal, Search, Trash, Upload, User
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { CreateFarmerDialog, ViewFarmerDialog, EditFarmerDialog, ImportFarmersDialog } from "@/components/farmers/dialogs";
import {
  Farmer, Location, FarmersResponse, LocationsResponse, ApiResponse, FarmerFilters
} from "@/types/farmer";

const Farmers: NextPage = () => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [farmerToEdit, setFarmerToEdit] = useState<Farmer | null>(null);

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFarmers();
    }
  }, [selectedLocation, searchTerm, currentPage, limit, isAuthenticated]);

  const fetchLocations = async () => {
    try {
      const response = await api.get<ApiResponse<LocationsResponse>>('/api/users/locations/all', {
        params: { limit: 100 }
      });
      setLocations(response.data.locations);
    } catch (error: any) {
      console.error('Failed to fetch locations:', error);
      toast.error(t('failedToLoadLocations'));
    }
  };

  const fetchFarmers = async () => {
    setIsLoading(true);
    try {
      const filters: FarmerFilters = {
        limit,
        offset: (currentPage - 1) * limit,
      };

      if (selectedLocation !== "all") {
        const location = locations.find(l => l.name === selectedLocation);
        if (location) {
          filters.locationId = location.id;
        }
      }

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      const response = await api.get<ApiResponse<FarmersResponse>>('/api/admin/farmers', {
        params: filters
      });

      setFarmers(response.data.farmers);
      setTotalCount(response.data.count);
    } catch (error: any) {
      console.error('Failed to fetch farmers:', error);
      toast.error(t('failedToLoadFarmers'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFarmer = async (farmerId: number) => {
    if (!confirm(t('confirmDeleteFarmer'))) return;

    try {
      await api.delete(`/api/admin/farmers/${farmerId}`);
      toast.success(t('farmerDeletedSuccessfully'));
      await fetchFarmers();
      if (selectedFarmer === farmerId) {
        setSelectedFarmer(null);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || t('failedToDeleteFarmer');
      toast.error(message);
    }
  };

  const fetchAllFarmersForExport = async (): Promise<Farmer[]> => {
    try {
      const filters: FarmerFilters = {
        limit: 100,
        offset: 0,
      };

      if (selectedLocation !== "all") {
        const location = locations.find(l => l.name === selectedLocation);
        if (location) {
          filters.locationId = location.id;
        }
      }

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      const response = await api.get<ApiResponse<FarmersResponse>>('/api/admin/farmers', {
        params: filters
      });

      return response.data.farmers;
    } catch (error) {
      console.error('Failed to fetch all farmers for export:', error);
      throw error;
    }
  };

  const handleExportFarmers = async () => {
    setIsExporting(true);
    try {
      const allFarmers = await fetchAllFarmersForExport();

      if (allFarmers.length === 0) {
        toast.error(t('noDataToExport'));
        return;
      }

      const exportData = allFarmers.map(farmer => ({
        [t('farmerId')]: farmer.id,
        [t('name')]: farmer.name,
        [t('phoneNumber')]: farmer.phone,
        [t('locations')]: farmer.locations.map(loc => loc.name).join('; '),
        [t('status')]: farmer.isActive ? t('active') : t('inactive'),
        [t('createdAt')]: new Date(farmer.createdAt).toLocaleDateString(),
        [t('updatedAt')]: new Date(farmer.updatedAt).toLocaleDateString(),
      }));

      let filename = `farmers_${new Date().toISOString().split('T')[0]}`;
      if (selectedLocation !== 'all') {
        filename += `_${selectedLocation}`;
      }
      if (searchTerm.trim()) {
        filename += `_search_${searchTerm.trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      filename += '.csv';

      api.exportAsCSV(exportData, filename);

      toast.success(t('farmersExportedSuccessfully') + ` (${allFarmers.length} ${t('farmers')})`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(t('failedToExportFarmers'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewFarmer = (farmerId: number) => {
    setSelectedFarmer(farmerId);
    setViewDialogOpen(true);
  };

  const handleEditFarmer = (farmer: Farmer) => {
    setFarmerToEdit(farmer);
    setViewDialogOpen(false);
    setEditDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchFarmers();
    setSelectedFarmer(null);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const StatusBadge = ({ isActive }: { isActive: boolean }) => {
    if (isActive) {
      return (
        <Badge className="border-[#ECFDF6] bg-[#ECFDF6] text-[#16a34a] hover:border-[#16a34a] hover:bg-[#16a34a] hover:text-white">
          {t("active")}
        </Badge>
      );
    }
    return (
      <Badge className="border-[#FEE2E2] bg-[#FEF2F2] text-[#DC2626] hover:border-[#DC2626] hover:bg-[#DC2626] hover:text-white">
        {t("inactive")}
      </Badge>
    );
  };

  const columns = [
    {
      id: "index",
      header: "#",
      width: "72px",
      numeric: true,
      value: (row: Farmer) => row.id,
    },
    {
      id: "name",
      header: t("name"),
      value: (row: Farmer) => row.name,
      cell: (row: Farmer) => (
        <button
          type="button"
          className="truncate text-left font-semibold text-slate-900 hover:text-[#147677]"
          onClick={() => handleViewFarmer(row.id)}
        >
          {row.name}
        </button>
      ),
    },
    {
      id: "phone",
      header: t("phone"),
      value: (row: Farmer) => row.phone,
    },
    {
      id: "locations",
      header: t("locations"),
      value: (row: Farmer) => row.locations.map((location) => location.name).join(", "),
      cell: (row: Farmer) => row.locations.map((location) => location.name).join(", ") || "—",
    },
    {
      id: "status",
      header: t("status"),
      width: "120px",
      value: (row: Farmer) => (row.isActive ? t("active") : t("inactive")),
      cell: (row: Farmer) => <StatusBadge isActive={row.isActive} />,
    },
    {
      id: "joinedDate",
      header: t("joinedDate"),
      width: "140px",
      value: (row: Farmer) => new Date(row.createdAt).getTime(),
      cell: (row: Farmer) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      id: "__actions",
      header: t("actions"),
      width: "96px",
      sortable: false,
      cell: (row: Farmer) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <MoreHorizontal className="h-4 w-4 text-slate-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => handleViewFarmer(row.id)}
            className="cursor-pointer"
          >
            <User className="h-4 w-4 mr-2 text-[#147677]" />
            {t("viewDetails")}
          </DropdownMenuItem>
          {user?.role === 'admin' && (
            <DropdownMenuItem
              onClick={() => handleEditFarmer(row)}
              className="cursor-pointer"
            >
              <Edit className="h-4 w-4 mr-2 text-[#147677]" />
              {t("editFarmer")}
            </DropdownMenuItem>
          )}
          {user?.role === 'admin' && (
            <>
              <Separator className="my-1" />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleDeleteFarmer(row.id)}
              >
                <Trash className="h-4 w-4 mr-2 text-[#e46064]" />
                <span className="text-[#e46064]">{t("delete")}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    },
  ];

  return (
      <AppLayout>
        <Head>
          <title>
            {t("farmers")} | {t("climateInformationSystem")}
          </title>
        </Head>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t("farmers")}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(true)}
                  className="border-gray-200 text-slate-600 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t("importData")}
              </Button>

              <Button
                  variant="outline"
                  onClick={handleExportFarmers}
                  disabled={isExporting}
                  className="border-gray-200 text-slate-600 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? t("exporting") : t("exportData")}
              </Button>

              {user?.role === 'admin' && (
                <Button
                  variant="primary"
                  onClick={() => setCreateDialogOpen(true)}
                  className="rounded-lg"
                >
                  {t("addFarmer")}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_24px_rgba(15,40,80,0.06)] px-5 pt-5 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {t("listOfFarmers")}
              </h2>

              <div className="flex w-full sm:w-auto items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder={t("search")}
                    className="pl-10 h-10 w-full sm:w-[220px] rounded-full bg-[#F3F4F6] border-0 shadow-none focus-visible:ring-1 focus-visible:ring-[#147677]/30"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="primary"
                      size="icon"
                      className="h-10 w-10 rounded-lg shrink-0"
                      title={selectedLocation === "all" ? t("allLocations") : selectedLocation}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSelectedLocation("all"); setCurrentPage(1); }}>
                      {t("allLocations")}
                    </DropdownMenuItem>
                    {locations.map((location) => (
                      <DropdownMenuItem
                        key={location.id}
                        onClick={() => { setSelectedLocation(location.name); setCurrentPage(1); }}
                      >
                        {location.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <DataTable
              label={t("farmers")}
              variant="sheet"
              data={farmers}
              columns={columns}
              getRowId={(row) => String(row.id)}
              loading={isLoading}
              skeletonRows={limit}
              rowHeight={56}
              emptyState={
                <div className="flex flex-col items-center space-y-2">
                  <User className="h-10 w-10 text-gray-300" />
                  <div className="text-slate-600 font-medium">{t("noFarmersFound")}</div>
                </div>
              }
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
              <p className="text-sm text-slate-500">
                {t("showingEntries", { count: isLoading ? 0 : farmers.length, total: totalCount })}
              </p>
              <Pagination
                label={t("farmers")}
                variant="boxed"
                showEdges
                count={totalPages}
                page={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </div>

        <ImportFarmersDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            locations={locations}
            onSuccess={handleDialogSuccess}
        />

        <CreateFarmerDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            locations={locations}
            onSuccess={handleDialogSuccess}
        />

        <ViewFarmerDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            farmerId={selectedFarmer}
            onEdit={handleEditFarmer}
        />

        <EditFarmerDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            farmer={farmerToEdit}
            locations={locations}
            onSuccess={handleDialogSuccess}
        />
      </AppLayout>
  );
};

export default Farmers;
