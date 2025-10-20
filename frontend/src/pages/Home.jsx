import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, LogOut, ShoppingCart, Edit2, Trash2, Filter } from 'lucide-react';
import { API } from '../App';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Home() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteItemId, setDeleteItemId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/items`),
        axios.get(`${API}/categories`)
      ]);
      setItems(itemsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (itemId) => {
    try {
      const response = await axios.patch(`${API}/items/${itemId}/toggle`);
      setItems(items.map(item => item.id === itemId ? response.data : item));
      toast.success('Item atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar item');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/items/${deleteItemId}`);
      setItems(items.filter(item => item.id !== deleteItemId));
      toast.success('Item removido!');
    } catch (error) {
      toast.error('Erro ao remover item');
    } finally {
      setDeleteItemId(null);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.id === categoryId);
  };

  const filteredItems = filterCategory === 'all' 
    ? items 
    : items.filter(item => item.category_id === filterCategory);

  const purchasedCount = items.filter(item => item.is_purchased).length;
  const totalCount = items.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 shadow-lg">
        <div className="container flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
              <ShoppingCart className="w-7 h-7" />
              Minhas Compras
            </h1>
            <p className="text-purple-100 text-sm mt-1">
              {purchasedCount} de {totalCount} items comprados
            </p>
          </div>
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="container mt-6">
        {/* Filter */}
        <div className="mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger data-testid="category-filter" className="w-48">
              <SelectValue placeholder="Filtrar categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="p-12 text-center border-dashed" data-testid="empty-state">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium">Nenhum item na lista</p>
              <p className="text-gray-400 text-sm mt-1">Adicione seu primeiro item de compra</p>
            </Card>
          ) : (
            filteredItems.map((item) => {
              const category = getCategoryById(item.category_id);
              return (
                <Card 
                  key={item.id} 
                  className={`item-card p-4 shadow-sm transition-all ${
                    item.is_purchased ? 'bg-gray-50 opacity-75' : 'bg-white hover:shadow-md'
                  }`}
                  data-testid={`item-card-${item.id}`}
                >
                  <div className="flex gap-3">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 pt-1">
                      <button
                        data-testid={`toggle-item-${item.id}`}
                        onClick={() => handleToggle(item.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          item.is_purchased 
                            ? 'bg-purple-500 border-purple-500' 
                            : 'border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {item.is_purchased && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Image */}
                    {item.photo_url && (
                      <div className="flex-shrink-0">
                        <img 
                          src={item.photo_url} 
                          alt={item.description}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-base ${
                        item.is_purchased ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}>
                        {item.description}
                      </p>
                      {category && (
                        <div className="flex items-center gap-1 mt-1">
                          <span 
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex gap-1">
                      <Button
                        data-testid={`edit-item-${item.id}`}
                        onClick={() => navigate(`/edit/${item.id}`)}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        data-testid={`delete-item-${item.id}`}
                        onClick={() => setDeleteItemId(item.id)}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          data-testid="add-item-button"
          onClick={() => navigate('/add')}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteItemId !== null} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este item da lista?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              data-testid="confirm-delete-button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}