package com.olima.organization;

import com.olima.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationEntity extends BaseEntity {
    private String name;
    private String slug;
    private String description;
    private boolean enabled;

    /**
     * Widget saytga qo'yilganda shu kalit yuboriladi va tashkilot SERVER tomonda aniqlanadi.
     * So'rov tanasidagi organizationId ga ishonilmaydi — u brauzerdan keladi va o'zgartirilishi mumkin.
     */
    @Column(name = "widget_key", unique = true)
    private String widgetKey;

    /** Mijoz saytida logo ustida chiqadigan salomlashish matni. null — widget standart matnni oladi. */
    @Column(name = "widget_greeting", length = 300)
    private String widgetGreeting;

    @Column(name = "widget_greeting_enabled", nullable = false)
    @Builder.Default
    private boolean widgetGreetingEnabled = true;
}
