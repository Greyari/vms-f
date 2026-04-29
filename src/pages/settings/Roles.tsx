import { useState, useEffect } from 'react';
import api from '@/lib/axios';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function Roles() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ id: string | null, name: string, permissions: string[] }>({ id: null, name: '', permissions: [] });

  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles');
      setRoles(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/permissions');
      setPermissions(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const openForm = (role: any = null) => {
    if (role) {
      setForm({
        id: role.id,
        name: role.name,
        permissions: role.permissions ? role.permissions.map((p: any) => p.name) : []
      });
    } else {
      setForm({ id: null, name: '', permissions: [] });
    }
    setModalOpen(true);
  };

  const togglePermission = (permName: string) => {
    setForm(prev => {
      if (prev.permissions.includes(permName)) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permName) };
      }
      return { ...prev, permissions: [...prev.permissions, permName] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (form.id) {
        await api.put(`/roles/${form.id}`, form);
      } else {
        await api.post('/roles', form);
      }
      setModalOpen(false);
      fetchRoles();
    } catch (error) {
      console.error(error);
      alert('Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setSelectedRoleId(id);
    setAlertOpen(true);
  };

  const executeDelete = async () => {
    if (!selectedRoleId) return;
    try {
      await api.delete(`/roles/${selectedRoleId}`);
      fetchRoles();
    } catch (error) {
      console.error(error);
      alert('Failed to delete role');
    } finally {
      setAlertOpen(false);
      setSelectedRoleId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Role Management</h1>
        <Button onClick={() => openForm()}>Add Role</Button>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900 border-b">
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Permissions Count</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-zinc-500">No roles found.</TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium capitalize">{role.name}</TableCell>
                    <TableCell>
                      <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs font-medium">
                        {role.permissions?.length || 0} Permissions
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openForm(role)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(role.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Role' : 'Add Role'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                required 
                placeholder="e.g. manager"
                disabled={form.name === 'administrator'} // protect admin role rename
              />
            </div>
            
            <div className="space-y-3">
              <Label>Assign Permissions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-zinc-50 dark:bg-zinc-900/50">
                {permissions.map(perm => (
                  <div key={perm.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`perm-${perm.id}`} 
                      checked={form.permissions.includes(perm.name)}
                      onCheckedChange={() => togglePermission(perm.name)}
                    />
                    <label 
                      htmlFor={`perm-${perm.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {perm.name}
                    </label>
                  </div>
                ))}
                {permissions.length === 0 && <div className="text-sm text-zinc-500">No permissions loaded.</div>}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Role?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. Users with this role might lose their access.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
