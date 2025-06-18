import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/i18n';
import {
    MapPin,
    Plus,
    Edit,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Location, ApiResponse } from '@/types/farmer';
import { Alert, AlertDescription } from '@/components/ui/alert';


interface CreateLocationData {
    name: string;
    lat?: number;
    lon?: number;
    isDefault?: boolean;
}

interface CreateLocationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateLocationDialog({ open, onOpenChange, onSuccess }: CreateLocationDialogProps) {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<CreateLocationData>({
        name: '',
        lat: undefined,
        lon: undefined,
        isDefault: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

    const validateForm = (): boolean => {
        const errors: {[key: string]: string} = {};

        if (!formData.name.trim()) {
            errors.name = t('locationNameRequired') || 'Location name is required';
        }

        if (formData.lat !== undefined && (isNaN(formData.lat) || formData.lat < -90 || formData.lat > 90)) {
            errors.lat = t('invalidLatitude') || 'Latitude must be between -90 and 90';
        }

        if (formData.lon !== undefined && (isNaN(formData.lon) || formData.lon < -180 || formData.lon > 180)) {
            errors.lon = t('invalidLongitude') || 'Longitude must be between -180 and 180';
        }

        if ((formData.lat !== undefined && formData.lon === undefined) ||
            (formData.lat === undefined && formData.lon !== undefined)) {
            errors.coordinates = t('bothCoordinatesRequired') || 'Both latitude and longitude must be provided';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            await api.post<ApiResponse<Location>>('/api/admin/locations', formData);
            toast.success(t('locationCreatedSuccessfully') || 'Location created successfully');
            onSuccess();
            onOpenChange(false);
            setFormData({
                name: '',
                lat: undefined,
                lon: undefined,
                isDefault: false
            });
            setValidationErrors({});
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || t('failedToCreateLocation');
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCoordinateChange = (field: 'lat' | 'lon', value: string) => {

        if (value === '') {
            setFormData(prev => ({ ...prev, [field]: undefined }));
            return;
        }

        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setFormData(prev => ({ ...prev, [field]: numValue }));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {t('addNewLocation') || 'Add New Location'}
                    </DialogTitle>
                    <DialogDescription>
                        {t('fillLocationDetails') || 'Fill in the location details below'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            {t('locationName') || 'Location Name'} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('enterLocationName') || 'Enter location name'}
                            required
                        />
                        {validationErrors.name && (
                            <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="lat">
                                {t('latitude') || 'Latitude'}
                            </Label>
                            <Input
                                id="lat"
                                value={formData.lat !== undefined ? formData.lat.toString() : ''}
                                onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                                placeholder="-1.944869"
                                type="number"
                                step="any"
                            />
                            {validationErrors.lat && (
                                <p className="text-sm text-red-500 mt-1">{validationErrors.lat}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lon">
                                {t('longitude') || 'Longitude'}
                            </Label>
                            <Input
                                id="lon"
                                value={formData.lon !== undefined ? formData.lon.toString() : ''}
                                onChange={(e) => handleCoordinateChange('lon', e.target.value)}
                                placeholder="30.092751"
                                type="number"
                                step="any"
                            />
                            {validationErrors.lon && (
                                <p className="text-sm text-red-500 mt-1">{validationErrors.lon}</p>
                            )}
                        </div>
                    </div>

                    {validationErrors.coordinates && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {validationErrors.coordinates}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="isDefault"
                            checked={formData.isDefault}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: !!checked }))}
                        />
                        <Label htmlFor="isDefault">{t('setAsDefault') || 'Set as default location'}</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (t('creating') || 'Creating...') : (t('createLocation') || 'Create Location')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


interface ViewLocationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    locationId: number | null;
    onEdit: (location: Location) => void;
}

export function ViewLocationDialog({ open, onOpenChange, locationId, onEdit }: ViewLocationDialogProps) {
    const { t } = useLanguage();
    const [location, setLocation] = useState<Location | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && locationId) {
            fetchLocation(locationId);
        }
    }, [open, locationId]);

    const fetchLocation = async (id: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get<ApiResponse<Location>>(`/api/admin/locations/${id}`);
            setLocation(response.data);
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || t('failedToLoadLocation');
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!locationId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {t('locationDetails') || 'Location Details'}
                    </DialogTitle>
                    <DialogDescription>
                        {t('viewLocationInfo') || 'View detailed information about this location'}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin h-8 w-8" />
                    </div>
                ) : error ? (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : location ? (
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-muted rounded-full h-16 w-16 flex items-center justify-center">
                                <MapPin className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold">{location.name}</h3>
                                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                    {location.lat && location.lon ? (
                                        <span>{location.lat.toFixed(6)}, {location.lon.toFixed(6)}</span>
                                    ) : (
                                        <span>{t('coordinatesNotSpecified') || 'Coordinates not specified'}</span>
                                    )}
                                </div>
                                {location.isDefault && (
                                    <Badge variant="secondary" className="mt-2">
                                        {t('defaultLocation') || 'Default Location'}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 gap-6">

                            <div>
                                <h4 className="font-medium mb-3">{t('additionalInfo') || 'Additional Info'}</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('locationId') || 'Location ID'}:</span>
                                        <span>#{location.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('createdAt') || 'Created At'}:</span>
                                        <span>{location.createdAt ? new Date(location.createdAt).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('lastUpdated') || 'Last Updated'}:</span>
                                        <span>{location.updatedAt ? new Date(location.updatedAt).toLocaleDateString() : '-'}</span>
                                    </div>
                                    {location.userId && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t('createdBy') || 'Created By'}:</span>
                                            <span>{location.user?.username || `User #${location.userId}`}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('close') || 'Close'}
                    </Button>
                    {location && (
                        <Button variant="primary" onClick={() => onEdit(location)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('editLocation') || 'Edit Location'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


interface UpdateLocationData {
    name?: string;
    lat?: number | null;
    lon?: number | null;
    isDefault?: boolean;
}

interface EditLocationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    location: Location | null;
    onSuccess: () => void;
}

export function EditLocationDialog({ open, onOpenChange, location, onSuccess }: EditLocationDialogProps) {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<UpdateLocationData>({});
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

    useEffect(() => {
        if (location) {
            setFormData({
                name: location.name,
                lat: location.lat,
                lon: location.lon,
                isDefault: location.isDefault,
            });
            setValidationErrors({});
        }
    }, [location]);

    const validateForm = (): boolean => {
        const errors: {[key: string]: string} = {};

        if (!formData.name?.trim()) {
            errors.name = t('locationNameRequired') || 'Location name is required';
        }

        if (formData.lat !== undefined && formData.lat !== null &&
            (isNaN(formData.lat) || formData.lat < -90 || formData.lat > 90)) {
            errors.lat = t('invalidLatitude') || 'Latitude must be between -90 and 90';
        }

        if (formData.lon !== undefined && formData.lon !== null &&
            (isNaN(formData.lon) || formData.lon < -180 || formData.lon > 180)) {
            errors.lon = t('invalidLongitude') || 'Longitude must be between -180 and 180';
        }

        if ((formData.lat !== undefined && formData.lat !== null && (formData.lon === undefined || formData.lon === null)) ||
            ((formData.lat === undefined || formData.lat === null) && formData.lon !== undefined && formData.lon !== null)) {
            errors.coordinates = t('bothCoordinatesRequired') || 'Both latitude and longitude must be provided';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!location) return;
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await api.put<ApiResponse<Location>>(`/api/admin/locations/${location.id}`, formData);
            toast.success(t('locationUpdatedSuccessfully') || 'Location updated successfully');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || t('failedToUpdateLocation');
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCoordinateChange = (field: 'lat' | 'lon', value: string) => {

        if (value === '') {
            setFormData(prev => ({ ...prev, [field]: null }));
            return;
        }

        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setFormData(prev => ({ ...prev, [field]: numValue }));
        }
    };

    if (!location) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        {t('editLocation') || 'Edit Location'}
                    </DialogTitle>
                    <DialogDescription>
                        {t('updateLocationDetails') || 'Update the location details'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">
                            {t('locationName') || 'Location Name'} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="edit-name"
                            value={formData.name || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('enterLocationName') || 'Enter location name'}
                            required
                        />
                        {validationErrors.name && (
                            <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-lat">
                                {t('latitude') || 'Latitude'}
                            </Label>
                            <Input
                                id="edit-lat"
                                value={formData.lat !== undefined && formData.lat !== null ? formData.lat.toString() : ''}
                                onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                                placeholder="-1.944869"
                                type="number"
                                step="any"
                            />
                            {validationErrors.lat && (
                                <p className="text-sm text-red-500 mt-1">{validationErrors.lat}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-lon">
                                {t('longitude') || 'Longitude'}
                            </Label>
                            <Input
                                id="edit-lon"
                                value={formData.lon !== undefined && formData.lon !== null ? formData.lon.toString() : ''}
                                onChange={(e) => handleCoordinateChange('lon', e.target.value)}
                                placeholder="30.092751"
                                type="number"
                                step="any"
                            />
                            {validationErrors.lon && (
                                <p className="text-sm text-red-500 mt-1">{validationErrors.lon}</p>
                            )}
                        </div>
                    </div>

                    {validationErrors.coordinates && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {validationErrors.coordinates}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="edit-isDefault"
                            checked={formData.isDefault}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: !!checked }))}
                        />
                        <Label htmlFor="edit-isDefault">{t('setAsDefault') || 'Set as default location'}</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button variant="primary" type="submit" disabled={isLoading}>
                            {isLoading ? (t('updating') || 'Updating...') : (t('updateLocation') || 'Update Location')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}