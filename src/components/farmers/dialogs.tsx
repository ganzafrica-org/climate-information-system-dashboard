import React, {useState, useEffect, useRef} from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/i18n';
import {
    User,
    MapPin,
    Phone,
    Calendar,
    Plus,
    Edit,
    Loader2,
    AlertCircle,
    Upload,
    CheckCircle, X, FileText, Download
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Farmer, Location, CreateFarmerData, UpdateFarmerData, ApiResponse } from '@/types/farmer';
import { Alert, AlertDescription } from '../ui/alert';
import {Progress} from "@/components/ui/progress";

interface CreateFarmerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    locations: Location[];
    onSuccess: () => void;
}

export function CreateFarmerDialog({ open, onOpenChange, locations, onSuccess }: CreateFarmerDialogProps) {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<CreateFarmerData>({
        name: '',
        phone: '',
        locationIds: [],
        isActive: true,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error(t('farmerNameRequired'));
            return;
        }

        if (!formData.phone.trim()) {
            toast.error(t('phoneNumberRequired'));
            return;
        }

        if (formData.locationIds.length === 0) {
            toast.error(t('locationRequired'));
            return;
        }

        setIsLoading(true);
        try {
            await api.post<ApiResponse<Farmer>>('/api/admin/farmers', formData);
            toast.success(t('farmerCreatedSuccessfully'));
            onSuccess();
            onOpenChange(false);
            setFormData({ name: '', phone: '', locationIds: [], isActive: true });
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || t('failedToCreateFarmer');
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocationToggle = (locationId: number) => {
        setFormData(prev => ({
            ...prev,
            locationIds: prev.locationIds.includes(locationId)
                ? prev.locationIds.filter(id => id !== locationId)
                : [...prev.locationIds, locationId]
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {t('addNewFarmer')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('fillFarmerDetails')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                {t('farmerName')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('enterFarmerName')}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                {t('phoneNumber')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+250788123456"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            {t('locations')} <span className="text-red-500">*</span>
                        </Label>
                        <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                            {locations.map((location) => (
                                <div key={location.id} className="flex items-center space-x-2 py-1">
                                    <Checkbox
                                        id={`location-${location.id}`}
                                        checked={formData.locationIds.includes(location.id)}
                                        onCheckedChange={() => handleLocationToggle(location.id)}
                                    />
                                    <Label htmlFor={`location-${location.id}`} className="text-sm cursor-pointer">
                                        {location.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        {formData.locationIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {formData.locationIds.map((locationId) => {
                                    const location = locations.find(l => l.id === locationId);
                                    return location ? (
                                        <Badge key={locationId} variant="secondary" className="text-xs">
                                            {location.name}
                                        </Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
                        />
                        <Label htmlFor="isActive">{t('activeFarmer')}</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? t('creating') : t('createFarmer')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface ViewFarmerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    farmerId: number | null;
    onEdit: (farmer: Farmer) => void;
}

interface EditFarmerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    farmer: Farmer | null;
    locations: Location[];
    onSuccess: () => void;
}

interface ImportResult {
    created: number;
    errors: number;
    total: number;
    errorDetails: Array<{
        row: any;
        error: string;
    }>;
}

interface ImportFarmersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    locations: Location[];
    onSuccess: () => void;
}

export function ViewFarmerDialog({ open, onOpenChange, farmerId, onEdit }: ViewFarmerDialogProps) {
    const { t } = useLanguage();
    const [farmer, setFarmer] = useState<Farmer | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && farmerId) {
            fetchFarmer(farmerId);
        }
    }, [open, farmerId]);

    const fetchFarmer = async (id: number) => {
        setIsLoading(true);
        try {
            const response = await api.get<ApiResponse<Farmer>>(`/api/admin/farmers/${id}`);
            setFarmer(response.data);
        } catch (error: any) {
            const message = error.response?.data?.message || t('failedToLoadFarmer');
            toast.error(message);
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (!farmer && !isLoading) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {t('farmerProfile')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('farmerDetails')}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin h-8 w-8" />
                    </div>
                ) : farmer ? (
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-muted rounded-full h-16 w-16 flex items-center justify-center">
                                <User className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold">{farmer.name}</h3>
                                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                    <Phone className="h-4 w-4" />
                                    <span>{farmer.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{t('joinedOn')} {new Date(farmer.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <Badge variant={farmer.isActive ? "default" : "secondary"}>
                                {farmer.isActive ? t('active') : t('inactive')}
                            </Badge>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {t('locations')}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {farmer.locations.map((location) => (
                                        <Badge key={location.id} variant="outline">
                                            {location.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium mb-3">{t('additionalInfo')}</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('farmerId')}:</span>
                                        <span>#{farmer.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('lastUpdated')}:</span>
                                        <span>{new Date(farmer.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('close')}
                    </Button>
                    {farmer && (
                        <Button onClick={() => onEdit(farmer)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('editFarmer')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function EditFarmerDialog({ open, onOpenChange, farmer, locations, onSuccess }: EditFarmerDialogProps) {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<UpdateFarmerData>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (farmer) {
            const locationIds = farmer.locationIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            setFormData({
                name: farmer.name,
                phone: farmer.phone,
                locationIds,
                isActive: farmer.isActive,
            });
        }
    }, [farmer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!farmer) return;

        if (!formData.name?.trim()) {
            toast.error(t('farmerNameRequired'));
            return;
        }

        if (!formData.phone?.trim()) {
            toast.error(t('phoneNumberRequired'));
            return;
        }

        if (!formData.locationIds || formData.locationIds.length === 0) {
            toast.error(t('locationRequired'));
            return;
        }

        setIsLoading(true);
        try {
            await api.put<ApiResponse<Farmer>>(`/api/admin/farmers/${farmer.id}`, formData);
            toast.success(t('farmerUpdatedSuccessfully'));
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || t('failedToUpdateFarmer');
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocationToggle = (locationId: number) => {
        setFormData(prev => ({
            ...prev,
            locationIds: prev.locationIds?.includes(locationId)
                ? prev.locationIds.filter(id => id !== locationId)
                : [...(prev.locationIds || []), locationId]
        }));
    };

    if (!farmer) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        {t('editFarmer')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('updateFarmerDetails')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">
                                {t('farmerName')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="edit-name"
                                value={formData.name || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('enterFarmerName')}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-phone">
                                {t('phoneNumber')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="edit-phone"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+250788123456"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            {t('locations')} <span className="text-red-500">*</span>
                        </Label>
                        <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                            {locations.map((location) => (
                                <div key={location.id} className="flex items-center space-x-2 py-1">
                                    <Checkbox
                                        id={`edit-location-${location.id}`}
                                        checked={formData.locationIds?.includes(location.id) || false}
                                        onCheckedChange={() => handleLocationToggle(location.id)}
                                    />
                                    <Label htmlFor={`edit-location-${location.id}`} className="text-sm cursor-pointer">
                                        {location.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        {formData.locationIds && formData.locationIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {formData.locationIds.map((locationId) => {
                                    const location = locations.find(l => l.id === locationId);
                                    return location ? (
                                        <Badge key={locationId} variant="secondary" className="text-xs">
                                            {location.name}
                                        </Badge>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="edit-isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
                        />
                        <Label htmlFor="edit-isActive">{t('activeFarmer')}</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? t('updating') : t('updateFarmer')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function ImportFarmersDialog({ open, onOpenChange, locations, onSuccess }: ImportFarmersDialogProps) {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const generateTemplate = () => {
        const templateData = [
            {
                name: 'Jean Uwimana',
                phone: '+250788123456',
                locationIds: '1,2',
                isActive: 'true'
            },
            {
                name: 'Marie Mukeshimana',
                phone: '+250785952376',
                locationIds: '3',
                isActive: 'true'
            },
            {
                name: 'Emmanuel Habimana',
                phone: '+250772345678',
                locationIds: '1,4,5',
                isActive: 'false'
            }
        ];

        const headers = ['name', 'phone', 'locationIds', 'isActive'];
        api.exportAsCSV(templateData, 'farmers_import_template.csv', headers);
        toast.success(t('templateDownloaded'));
    };

    const handleFileSelect = (file: File) => {
        if (!file.name.endsWith('.csv')) {
            toast.error(t('onlyCSVFilesAllowed'));
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error(t('fileTooLarge'));
            return;
        }

        setSelectedFile(file);
        setImportResult(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            toast.error(t('pleaseSelectFile'));
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await api.uploadFile<ApiResponse<ImportResult>>(
                '/api/admin/farmers/import',
                selectedFile
            );

            clearInterval(progressInterval);
            setUploadProgress(100);

            setImportResult(response.data);

            if (response.data.errors > 0) {
                toast.warning(
                    t('importCompletedWithErrors', {
                        created: response.data.created,
                        errors: response.data.errors
                    })
                );
            } else {
                toast.success(
                    t('importSuccessful', { created: response.data.created })
                );
            }

            if (response.data.created > 0) {
                onSuccess();
            }
        } catch (error: any) {
            const message = error.response?.data?.message || t('failedToImportFarmers');
            toast.error(message);
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setImportResult(null);
        setUploadProgress(0);
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onOpenChange(false);
    };
//TODO: use this function instead of uploading locationIds directly
    const getLocationName = (locationId: number) => {
        return locations.find(loc => loc.id === locationId)?.name || `ID: ${locationId}`;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        {t('importFarmers')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('importFarmersFromCSV')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                    {t('csvTemplate')}
                                </h4>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                    {t('downloadTemplateDescription')}
                                </p>
                                <Button variant="outline" size="sm" onClick={generateTemplate}>
                                    <Download className="h-4 w-4 mr-2" />
                                    <span className="hidden md:block">{t('downloadTemplate')}</span>
                                </Button>
                            </div>
                        </div>
                    </div>


                    <div className="space-y-4">
                        <h4 className="font-medium">{t('uploadCSVFile')}</h4>

                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                dragOver
                                    ? 'border-primary bg-primary/5'
                                    : selectedFile
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                            }`}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            {selectedFile ? (
                                <div className="space-y-2">
                                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                                    <p className="font-medium">{selectedFile.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedFile(null)}
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        {t('removeFile')}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                                    <p className="text-muted-foreground">
                                        {t('dragDropOrClick')}
                                    </p>
                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        {t('selectFile')}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />
                    </div>

                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{t('uploading')}</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} className="w-full" />
                        </div>
                    )}

                    {importResult && (
                        <div className="space-y-4">
                            <h4 className="font-medium">{t('importResults')}</h4>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                                    <div className="text-sm text-green-700 dark:text-green-300">{t('created')}</div>
                                </div>
                                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                                    <div className="text-sm text-red-700 dark:text-red-300">{t('errors')}</div>
                                </div>
                                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                                    <div className="text-sm text-blue-700 dark:text-blue-300">{t('total')}</div>
                                </div>
                            </div>

                            {importResult.errorDetails.length > 0 && (
                                <div className="space-y-2">
                                    <h5 className="font-medium text-red-600">{t('errorDetails')}</h5>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {importResult.errorDetails.map((error, index) => (
                                            <Alert key={index} variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription className="text-sm">
                                                    <strong>{t('row')} {index + 1}:</strong> {error.error}
                                                    <br />
                                                    <span className="text-xs opacity-75">
                            {t('data')}: {JSON.stringify(error.row)}
                          </span>
                                                </AlertDescription>
                                            </Alert>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        {importResult ? t('close') : t('cancel')}
                    </Button>
                    {!importResult && (
                        <Button
                            onClick={handleImport}
                            disabled={!selectedFile || isUploading}
                        >
                            {isUploading ? t('importing') : t('importFarmers')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}