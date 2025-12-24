# build.py
import os
import shutil
import PyInstaller.__main__
from pathlib import Path

def clean_build_folders():
    """Очистка предыдущих сборок"""
    folders = ['build', 'dist']
    for folder in folders:
        if Path(folder).exists():
            shutil.rmtree(folder)
            print(f"Удалена папка: {folder}")

def copy_static_files():
    """Копирование статических файлов в dist"""
    dist_path = Path('dist') / 'it_bookshelf'
    
    # Копируем статические файлы
    shutil.copytree('static', dist_path / 'static', dirs_exist_ok=True)
    shutil.copytree('templates', dist_path / 'templates', dirs_exist_ok=True)
    
    # Создаем пустую папку uploads
    (dist_path / 'uploads').mkdir(exist_ok=True)
    
    print("Статические файлы скопированы")

def build_executable():
    """Сборка исполняемого файла"""
    print("Начинаем сборку приложения...")
    
    PyInstaller.__main__.run([
        'app.py',
        '--name=IT_Bookshelf',
        '--onefile',  # Один исполняемый файл
        '--windowed',  # Без консоли (только для Windows)
        '--add-data=templates;templates',
        '--add-data=static;static',
        '--clean',
        '--noconfirm'
    ])
    
    print("\n✅ Сборка завершена!")
    print(f"Исполняемый файл находится в папке: dist/")

if __name__ == '__main__':
    clean_build_folders()
    build_executable()
    # После сборки нужно вручную скопировать статические файлы в dist/IT_Bookshelf/
    print("\n📋 После сборки выполните:")
    print("1. Создайте папку dist/IT_Bookshelf/")
    print("2. Скопируйте туда папки static/ и templates/")
    print("3. Запустите IT_Bookshelf.exe")
