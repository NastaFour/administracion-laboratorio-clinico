---
name: django-drf
description: >
  Django REST Framework patterns for serializers, viewsets, authentication, permissions,
  pagination, and filtering. Trigger when building or reviewing Django APIs, REST endpoints,
  ModelSerializer, APIView, or ViewSet implementations.
license: MIT
compatibility: "Works with Claude Code, Cursor, Gemini, and any other agentskills.io compatible agent. Requires Python 3.8+."
allowed-tools: Read
metadata:
  author: gentleman-programming
  version: "1.0"
  category: 04-backend
  tags: [django, drf, python, rest, api, serializers, viewsets, authentication]
---

# Django REST Framework — Patterns & Best Practices

## When to Use

Load this skill when:
- Building or extending a Django REST API
- Writing serializers, viewsets, or permissions
- Configuring authentication (JWT, session, token)
- Implementing pagination, filtering, or throttling

---

## Serializers

```python
# ✅ DO: ModelSerializer with explicit fields
from rest_framework import serializers
from .models import Order

class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'sku', 'qty', 'status', 'customer_name', 'total', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_total(self, obj):
        return obj.qty * obj.unit_price

# Nested serializers
class OrderDetailSerializer(OrderSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ['items']
```

```python
# ❌ DON'T: fields = '__all__' — exposes internal fields
class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'
```

---

## ViewSets

```python
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    filterset_fields = ['status', 'customer']
    search_fields = ['sku']
    ordering_fields = ['created_at', 'total']

    def get_queryset(self):
        # Always scope to current user
        return Order.objects.filter(
            customer=self.request.user
        ).select_related('customer').prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

    # Custom action
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        order = self.get_object()
        order.cancel()
        return Response({'status': 'cancelled'})
```

---

## URLs (Router)

```python
from rest_framework.routers import DefaultRouter
from django.urls import path, include

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('api/v1/', include(router.urls)),
]
```

---

## Permissions

```python
from rest_framework.permissions import BasePermission

class IsOrderOwner(BasePermission):
    """Allow access only to order owner."""
    message = "You do not have permission to access this order."

    def has_object_permission(self, request, view, obj):
        return obj.customer == request.user

class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.is_staff
```

---

## Authentication (JWT with SimpleJWT)

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# urls.py
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns += [
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
]
```

---

## Pagination

```python
from rest_framework.pagination import PageNumberPagination

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })
```

---

## Error Handling

```python
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException

class BusinessRuleViolation(APIException):
    status_code = 422
    default_detail = 'Business rule violation.'
    default_code = 'business_rule_violation'

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            'error': {
                'code': response.status_code,
                'message': response.data if isinstance(response.data, str) else response.data.get('detail', str(response.data)),
            }
        }
    return response
```

---

## Testing

```python
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

class OrderViewSetTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='test', password='pass')
        self.client.force_authenticate(user=self.user)

    def test_create_order_returns_201(self):
        data = {'sku': 'PROD-1', 'qty': 2}
        response = self.client.post('/api/v1/orders/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/v1/orders/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

---

## Integration con skillsGV

Combinar con: `postgresql` + `prisma-orm` (si migrás a JS), `pytest` (testing), `docker` (containerización), `jwt-bcrypt` (auth alternativa), `api-design` (diseño REST), `error-handling` (manejo de errores).
