from django.core.management.base import BaseCommand

from tasks_app.models import Proposal, Task, Team
from tasks_app.services.scoring import calculate_score


class Command(BaseCommand):
    help = "Create or refresh a small demo dataset for the Iske MVP."

    def handle(self, *args, **options):
        drafts = [
            {"title": "Черновик: запись на консультацию", "industry": "Здравоохранение", "context": "Пациентам сложно записаться на консультацию."},
            {"title": "Черновик: учёт заявок", "industry": "Образование", "context": "Заявки студентов обрабатываются вручную.", "need": "Нужно сократить время обработки."},
            {"title": "Черновик: доставка заказов", "industry": "Логистика", "context": "Клиенты не всегда знают статус доставки.", "need": "Хотим улучшить информирование клиентов.", "users": "Клиенты."},
            {"title": "Черновик: анализ отзывов", "industry": "Розничная торговля", "context": "Отзывы о магазинах собираются в разных местах.", "need": "Нужно видеть общие проблемы.", "users": "Менеджеры магазинов.", "data_and_materials": "Есть CSV с отзывами."},
            {"title": "Черновик: заявка на ремонт", "industry": "Недвижимость", "context": "Заявки на ремонт теряются в переписке.", "need": "Нужно централизовать их учёт.", "users": "Арендаторы и управляющий.", "data_and_materials": "Есть примеры заявок."},
        ]
        for values in drafts:
            Task.objects.update_or_create(title=values["title"], defaults={**values, "is_confirmed": False, "is_published": False, "readiness_score": 0})

        cards = [
            ("Планирование визитов в клинику", "Здравоохранение"),
            ("Панель заявок для учебного центра", "Образование"),
            ("Отслеживание доставки", "Логистика"),
            ("Сводка обратной связи покупателей", "Розничная торговля"),
            ("Портал заявок на обслуживание", "Недвижимость"),
        ]
        teams = [
            ("Команда Atlas", "Здравоохранение, сервисы", "Аналитика, UX", "Python, React"),
            ("Команда Orken", "Образование", "Веб-разработка", "Django, TypeScript"),
            ("Команда Jet", "Логистика", "Интеграции", "Python, PostgreSQL"),
            ("Команда Qadam", "Розничная торговля", "Аналитика данных", "Python, BI"),
            ("Команда Samal", "Недвижимость", "Прототипирование", "React, Django"),
        ]
        for index, (title, industry) in enumerate(cards, start=1):
            values = {
                "title": title,
                "industry": industry,
                "context": f"Организации отрасли {industry.lower()} тратят время на ручную обработку запросов.",
                "need": "Нужно сделать процесс понятнее и быстрее для сотрудников и пользователей.",
                "users": "Клиенты и сотрудники организации.",
                "data_and_materials": "Доступны обезличенные примеры запросов и описание текущего процесса.",
                "constraints": "Срок демонстрационного прототипа — четыре недели; персональные данные использовать нельзя.",
                "expected_result": "Кликабельный прототип и описание предлагаемого процесса.",
                "success_criteria": "Представитель бизнеса может пройти основной сценарий без помощи команды.",
                "contact": f"Представитель бизнеса {index}",
                "collaboration_format": "Еженедельная консультация и обратная связь в течение двух рабочих дней.",
                "is_confirmed": True,
                "is_published": True,
            }
            task, _ = Task.objects.update_or_create(title=title, defaults=values)
            task.readiness_score = calculate_score(task)[0]
            task.save(update_fields=["readiness_score", "updated_at"])

        for name, interests, skills, technologies in teams:
            Team.objects.update_or_create(name=name, defaults={"interests": interests, "skills": skills, "technologies": technologies})

        for index, (title, _) in enumerate(cards, start=1):
            task = Task.objects.get(title=title)
            team = Team.objects.get(name=teams[index - 1][0])
            Proposal.objects.update_or_create(
                task=task,
                team=team,
                defaults={
                    "idea": f"Предложение команды {team.name}: упростить основной сценарий задачи.",
                    "plan": "Изучить процесс, подготовить прототип, собрать обратную связь и доработать решение.",
                    "duration": "4 недели",
                    "prototype_url": "",
                },
            )

        self.stdout.write(self.style.SUCCESS("Demo data is ready: 5 drafts, 5 published tasks, 5 teams, 5 proposals."))
