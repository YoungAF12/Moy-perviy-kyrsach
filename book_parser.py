import os
import imghdr
from pathlib import Path
from pdfminer.high_level import extract_text
from pdf2image import convert_from_path
from PIL import Image

def extract_book_info(file_path):
    """Извлечение информации о книге из файла"""
    path = Path(file_path)
    
    # Базовая информация
    info = {
        'title': path.stem,  # Имя файла без расширения
        'author': '',
        'description': '',
        'file_type': path.suffix.lower(),
        'file_size': os.path.getsize(file_path),
        'cover_path': None
    }
    
    # Обработка PDF файлов
    if info['file_type'] == '.pdf':
        try:
            # Пытаемся извлечь текст с первых страниц
            text = extract_text(file_path, maxpages=5)
            lines = text.split('\n')
            
            # Ищем заголовок в первых строках
            for line in lines[:10]:
                if line.strip() and len(line.strip()) > 3:
                    info['title'] = line.strip()[:100]  # Ограничиваем длину
                    break
            
            # Создаем обложку из первой страницы
            try:
                images = convert_from_path(file_path, first_page=1, last_page=1)
                if images:
                    cover_path = path.parent / f"{path.stem}_cover.jpg"
                    images[0].save(cover_path, 'JPEG', quality=85)
                    info['cover_path'] = str(cover_path)
            except:
                pass  # Если не удалось создать обложку
                
        except Exception as e:
            print(f"Ошибка при парсинге PDF: {e}")
    
    # Обработка изображений (если книга в виде картинок)
    elif info['file_type'] in ['.jpg', '.jpeg', '.png', '.gif']:
        info['cover_path'] = file_path
    
    return info

def is_valid_image(file_path):
    """Проверка, является ли файл валидным изображением"""
    try:
        return imghdr.what(file_path) is not None
    except:
        return False
