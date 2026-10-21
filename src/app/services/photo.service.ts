import { Injectable, signal } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  public photos = signal<UserPhoto[]>([]);
  private PHOTO_STORAGE: string = 'photos';

  constructor() {}

  // Cargar fotos guardadas al iniciar la aplicación
  public async loadSaved() {
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    const photos = (value ? JSON.parse(value) : []) as UserPhoto[];

    for (let photo of photos) {
      const readFile = await Filesystem.readFile({
        path: photo.filepath,
        directory: Directory.Data,
      });
      photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
    }

    this.photos.set(photos);
  }

  public async addNewToGallery() {
    // Configuración actualizada con las opciones que compartiste
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Base64,
      quality: 85,
      width: 1600,
      correctOrientation: true,
      saveToGallery: true // Guardar también en la galería de Android
    });

    console.log('Guardada en la galería:', photo.saved);

    // Guardar archivo físico en el almacenamiento interno de la app
    const savedImageFile = await this.savePicture(photo.base64String!);

    // Actualizamos la señal para mostrar la nueva foto en la interfaz
    this.photos.update((photos) => [savedImageFile, ...photos]);

    // Guardar registro persistente
    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos()),
    });
  }

  // Guardar archivo en el Filesystem del dispositivo
  private async savePicture(base64Data: string): Promise<UserPhoto> {
    const fileName = new Date().getTime() + '.jpeg';
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    return {
      filepath: fileName,
      webviewPath: `data:image/jpeg;base64,${base64Data}`,
    };
  }

  // Función opcional para eliminar fotos
  public async deletePicture(photo: UserPhoto, position: number) {
    this.photos.update((photos) => photos.filter((_, index) => index !== position));

    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos()),
    });

    const filename = photo.filepath.substring(photo.filepath.lastIndexOf('/') + 1);
    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Data,
    });
  }
}

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}