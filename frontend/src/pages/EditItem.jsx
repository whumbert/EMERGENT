import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Upload, X } from 'lucide-react';
import { API } from '../App';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function EditItem() {
  const { id } = useParams();
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    return () => {
      stopCamera();
    };
  }, [id]);

  const fetchData = async () => {
    try {
      const [itemRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/items`),
        axios.get(`${API}/categories`)
      ]);
      
      const item = itemRes.data.find(i => i.id === id);
      if (!item) {
        toast.error('Item não encontrado');
        navigate('/');
        return;
      }

      setDescription(item.description);
      setCategoryId(item.category_id);
      setPhotoUrl(item.photo_url || '');
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      toast.error('Erro ao acessar câmera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoUrl(imageData);
      stopCamera();
      toast.success('Foto capturada!');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPhotoUrl(response.data.url);
      toast.success('Imagem carregada!');
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('Digite uma descrição');
      return;
    }

    if (!categoryId) {
      toast.error('Selecione uma categoria');
      return;
    }

    setSaving(true);

    try {
      await axios.put(`${API}/items/${id}`, {
        description: description.trim(),
        category_id: categoryId,
        photo_url: photoUrl || null
      });
      toast.success('Item atualizado!');
      navigate('/');
    } catch (error) {
      toast.error('Erro ao atualizar item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 shadow-lg">
        <div className="container flex items-center gap-3">
          <Button
            data-testid="back-button"
            onClick={() => navigate('/')}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Editar Item</h1>
        </div>
      </div>

      <div className="container mt-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Editar Item de Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  data-testid="description-input"
                  type="text"
                  placeholder="Ex: Maçã Fuji 1kg"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                  className="h-11"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={saving}>
                  <SelectTrigger data-testid="category-select" className="h-11">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Photo */}
              <div className="space-y-2">
                <Label>Foto (opcional)</Label>
                
                {!showCamera && !photoUrl && (
                  <div className="flex gap-2">
                    <Button
                      data-testid="camera-button"
                      type="button"
                      onClick={startCamera}
                      variant="outline"
                      className="flex-1 h-11"
                      disabled={saving}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Tirar Foto
                    </Button>
                    <Button
                      data-testid="upload-button"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="flex-1 h-11"
                      disabled={saving}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                )}

                {showCamera && (
                  <div className="camera-preview space-y-3">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline
                      className="w-full rounded-lg border-2 border-purple-300"
                    />
                    <div className="flex gap-2">
                      <Button
                        data-testid="capture-button"
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 bg-purple-500 hover:bg-purple-600"
                      >
                        Capturar
                      </Button>
                      <Button
                        data-testid="cancel-camera-button"
                        type="button"
                        onClick={stopCamera}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {photoUrl && !showCamera && (
                  <div className="relative image-preview">
                    <img src={photoUrl} alt="Preview" className="rounded-lg" />
                    <Button
                      data-testid="remove-photo-button"
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 rounded-full h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button
                  data-testid="submit-button"
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  disabled={saving}
                >
                  {saving ? <div className="spinner mx-auto"></div> : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}